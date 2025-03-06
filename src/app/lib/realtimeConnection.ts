import { RefObject } from "react";

export async function createRealtimeConnection(
  EPHEMERAL_KEY: string,
  audioElement: RefObject<HTMLAudioElement | null>
): Promise<{ pc: RTCPeerConnection; dc: RTCDataChannel }> {
  // Add a debug warning to check if this is being called when voice mode might be active
  console.log("🐞 DEBUG: createRealtimeConnection called - this should not happen with voice mode active");
  console.trace(); // Log stack trace for debugging

  // Create a new RTCPeerConnection with explicit STUN/TURN servers
  const pc = new RTCPeerConnection({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
    ]
  });

  // Log connection state changes for debugging
  pc.addEventListener('connectionstatechange', () => {
    console.log(`📡 WebRTC connection state changed to: ${pc.connectionState}`);
  });

  // Log ICE connection state changes
  pc.addEventListener('iceconnectionstatechange', () => {
    console.log(`❄️ ICE connection state: ${pc.iceConnectionState}`);
  });

  // Log ICE gathering state changes
  pc.addEventListener('icegatheringstatechange', () => {
    console.log(`❄️ ICE gathering state: ${pc.iceGatheringState}`);
  });

  // Handle ICE candidate errors
  pc.addEventListener('icecandidateerror', (event: any) => {
    console.error(`❌ ICE candidate error:`, event);
  });

  // Handle tracks
  pc.ontrack = (e) => {
    console.log(`🔊 Track received:`, e.track.kind);
    if (audioElement.current) {
      audioElement.current.srcObject = e.streams[0];
    }
  };

  // Get user media with more robust error handling
  try {
    console.log(`🎤 Requesting microphone access`);
    const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
    pc.addTrack(ms.getTracks()[0]);
    console.log(`✅ Microphone track added`);
  } catch (error) {
    console.error(`❌ Error accessing microphone:`, error);
    throw new Error(`Failed to access microphone: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Create data channel with retry mechanism
  let dc: RTCDataChannel;
  try {
    console.log(`📝 Creating data channel`);
    dc = pc.createDataChannel("oai-events", {
      ordered: true
    });
    console.log(`✅ Data channel created`);
  } catch (error) {
    console.error(`❌ Error creating data channel:`, error);
    throw new Error(`Failed to create data channel: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Create and set local offer
  try {
    console.log(`📝 Creating offer`);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    console.log(`✅ Local description set`);
  } catch (error) {
    console.error(`❌ Error creating/setting offer:`, error);
    throw new Error(`Failed in offer creation phase: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Exchange SDP with server
  try {
    console.log(`🔄 Sending offer to server`);
    const baseUrl = "https://api.openai.com/v1/realtime";
    const model = "gpt-4o-mini-realtime-preview";

    // Wait for ICE gathering to complete or timeout after 5 seconds
    if (pc.iceGatheringState !== 'complete') {
      console.log(`⏳ Waiting for ICE gathering to complete`);
      await Promise.race([
        new Promise<void>(resolve => {
          const checkState = () => {
            if (pc.iceGatheringState === 'complete') {
              resolve();
            }
          };
          pc.addEventListener('icegatheringstatechange', checkState);
          checkState();
        }),
        new Promise<void>((_, reject) => setTimeout(() => {
          console.log(`⚠️ ICE gathering timed out, proceeding anyway`);
          // Don't reject, just proceed with what we have
        }, 5000))
      ]);
    }

    // Ensure we have a valid SDP before sending
    if (!pc.localDescription || !pc.localDescription.sdp) {
      throw new Error('No valid local SDP available');
    }

    const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
      method: "POST",
      body: pc.localDescription.sdp,
      headers: {
        Authorization: `Bearer ${EPHEMERAL_KEY}`,
        "Content-Type": "application/sdp",
      },
    });

    if (!sdpResponse.ok) {
      throw new Error(`Server responded with status: ${sdpResponse.status} ${sdpResponse.statusText}`);
    }

    const answerSdp = await sdpResponse.text();
    console.log(`✅ Received answer from server`);

    const answer: RTCSessionDescriptionInit = {
      type: "answer",
      sdp: answerSdp,
    };

    await pc.setRemoteDescription(answer);
    console.log(`✅ Remote description set`);
  } catch (error) {
    console.error(`❌ Error in SDP exchange:`, error);
    throw new Error(`Failed in SDP exchange: ${error instanceof Error ? error.message : String(error)}`);
  }

  return { pc, dc };
} 
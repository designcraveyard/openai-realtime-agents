import { AllAgentConfigsType } from "@/app/types";
import frontDeskAuthentication from "./frontDeskAuthentication";
import customerServiceRetail from "./customerServiceRetail";
import simpleExample from "./simpleExample";
import realtyAgent from "./realtyAgent";
import realtyMobileAgent from "./realty_mobile_agent";

// Debug log to verify realtyAgent is loading correctly
console.log("🏠 DEBUG: Loading realtyAgent with tools:", 
  realtyAgent.tools ? realtyAgent.tools.map(tool => {
    return tool.type === "function" ? `function:${tool.name}` : `tool:${tool.type}`;
  }) : 'No tools found');
console.log("🏠 DEBUG: realtyAgent toolLogic functions:", 
  realtyAgent.toolLogic ? Object.keys(realtyAgent.toolLogic) : 'No toolLogic found');

// Debug log to verify realtyMobileAgent is loading correctly
console.log("📱 DEBUG: Loading realtyMobileAgent with tools:", 
  realtyMobileAgent.tools ? realtyMobileAgent.tools.map(tool => {
    return tool.type === "function" ? `function:${tool.name}` : `tool:${tool.type}`;
  }) : 'No tools found');
console.log("📱 DEBUG: realtyMobileAgent toolLogic functions:", 
  realtyMobileAgent.toolLogic ? Object.keys(realtyMobileAgent.toolLogic) : 'No toolLogic found');

export const allAgentSets: AllAgentConfigsType = {
  frontDeskAuthentication,
  customerServiceRetail,
  simpleExample,
  realtyAgent: [realtyAgent],
  realtyMobileAgent: [realtyMobileAgent],
};

export const defaultAgentSetKey = "simpleExample";

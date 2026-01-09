/* eslint-disable @typescript-eslint/no-explicit-any */

interface TranscriberConfig {
  provider: string
  keywords: string[]
}

interface ModelConfig {
  provider: string
  model: string
  messages: {
    role: string
    content: string
  }[]
}

interface VoiceConfig {
  provider: string
  voiceId: string
}

export interface AssistantConfig {
  transcriber: TranscriberConfig
  model: ModelConfig
  voice: VoiceConfig
  firstMessage: string
  endCallMessage: string
  endCallFunctionEnabled: boolean
}

export interface AssistantResponse {
  id: string
  createdAt: string
  updatedAt: string
  transcriber: TranscriberConfig
  model: ModelConfig
  voice: VoiceConfig
  firstMessage: string
  endCallMessage: string
  endCallFunctionEnabled: boolean
  [key: string]: any
}

export interface InboundPhoneCall {
  type: "inboundPhoneCall"
  costs: Cost[]
  messages: Message[]
  phoneCallProvider: string
  phoneCallTransport: string
  status: string
  endedReason: string
  destination: Destination
  id: string
  orgId: string
  createdAt: string
  updatedAt: string
  startedAt: string
  endedAt: string
  cost: number
  costBreakdown: CostBreakdown
  artifactPlan: ArtifactPlan
  analysis: Analysis
  monitor: Monitor
  artifact: Artifact
  phoneCallProviderId: string
  assistantId: string
  assistant: Assistant
  assistantOverrides: AssistantOverrides
  squadId: string
  squad: Squad
  phoneNumberId: string
  phoneNumber: PhoneNumber
  customerId: string
  customer: Customer
  name: string
  summary: string
  stereoRecordingUrl: string
  transcript: string
}

interface Cost {
  type: string
  minutes: number
  cost: number
}

interface Message {
  role: string
  message: string
  time: number
  endTime: number
  secondsFromStart: number
  duration: number
}

interface Destination {
  type: string
  numberE164CheckEnabled: boolean
  number: string
  extension: string
  callerId: string
  message: string
  description: string
}

interface CostBreakdown {
  transport: number
  stt: number
  llm: number
  tts: number
  vapi: number
  total: number
  llmPromptTokens: number
  llmCompletionTokens: number
  ttsCharacters: number
  analysisCostBreakdown: AnalysisCostBreakdown
}

interface AnalysisCostBreakdown {
  summary: number
  summaryPromptTokens: number
  summaryCompletionTokens: number
  structuredData: number
  structuredDataPromptTokens: number
  structuredDataCompletionTokens: number
  successEvaluation: number
  successEvaluationPromptTokens: number
  successEvaluationCompletionTokens: number
}

interface ArtifactPlan {
  recordingEnabled: boolean
  videoRecordingEnabled: boolean
  recordingPath: string
}

interface Analysis {
  summary: string
  structuredData: Record<string, any>
  successEvaluation: string
}

interface Monitor {
  listenUrl: string
  controlUrl: string
}

interface Artifact {
  messages: Message[]
  messagesOpenAIFormatted: OpenAIFormattedMessage[]
  recordingUrl: string
  stereoRecordingUrl: string
  videoRecordingUrl: string
  videoRecordingStartDelaySeconds: number
  transcript: string
}

interface OpenAIFormattedMessage {
  content: string
  role: string
}

interface Assistant {
  transcriber: Transcriber
  model: Model
  voice: Voice
  firstMessageMode: string
  hipaaEnabled: boolean
  clientMessages: string[]
  serverMessages: string[]
  silenceTimeoutSeconds: number
  maxDurationSeconds: number
  backgroundSound: string
  backchannelingEnabled: boolean
  backgroundDenoisingEnabled: boolean
  modelOutputInMessagesEnabled: boolean
  transportConfigurations: TransportConfiguration[]
  name: string
  firstMessage: string
  voicemailDetection: VoicemailDetection
  voicemailMessage: string
  endCallMessage: string
  endCallPhrases: string[]
  metadata: Record<string, any>
  serverUrl: string
  serverUrlSecret: string
  analysisPlan: AnalysisPlan
  artifactPlan: ArtifactPlan
  messagePlan: MessagePlan
  startSpeakingPlan: StartSpeakingPlan
  stopSpeakingPlan: StopSpeakingPlan
  monitorPlan: MonitorPlan
  credentialIds: string[]
}

interface Transcriber {
  provider: string
  model: string
  language: string
  smartFormat: boolean
  languageDetectionEnabled: boolean
  keywords: string[]
  endpointing: number
}

interface Model {
  messages: OpenAIFormattedMessage[]
  tools: Tool[]
  toolIds: string[]
  provider: string
  model: string
  temperature: number
  knowledgeBase: KnowledgeBaseConfig
  maxTokens: number
  emotionRecognitionEnabled: boolean
  numFastTurns: number
}

interface Tool {
  async: boolean
  messages: ToolMessage[]
  type: string
  function: ToolFunction
  server: ToolServer
}

interface ToolMessage {
  type: string
  content: string
  conditions?: ToolMessageCondition[]
}

interface ToolMessageCondition {
  value: string
  operator: string
  param: string
}

interface ToolFunction {
  name: string
  description: string
  parameters: {
    type: string
    properties: Record<string, any>
    required: string[]
  }
}

interface ToolServer {
  timeoutSeconds?: number
  url: string
  secret?: string
}

interface KnowledgeBaseConfig {
  provider: string
  topK: number
  fileIds: string[]
}

interface Voice {
  fillerInjectionEnabled: boolean
  provider: string
  voiceId: string
  speed: number
  chunkPlan: ChunkPlan
}

interface ChunkPlan {
  enabled: boolean
  minCharacters: number
  punctuationBoundaries: string[]
  formatPlan: FormatPlan
}

interface FormatPlan {
  enabled: boolean
  numberToDigitsCutoff: number
  replacements: Replacement[]
}

interface Replacement {
  type: string
  key: string
  value: string
}

interface TransportConfiguration {
  provider: string
  timeout: number
  record: boolean
  recordingChannels: string
}

interface VoicemailDetection {
  provider: string
  voicemailDetectionTypes: string[]
  enabled: boolean
  machineDetectionTimeout: number
  machineDetectionSpeechThreshold: number
  machineDetectionSpeechEndThreshold: number
  machineDetectionSilenceTimeout: number
}

interface AnalysisPlan {
  summaryPrompt: string
  summaryRequestTimeoutSeconds: number
  structuredDataRequestTimeoutSeconds: number
  successEvaluationPrompt: string
  successEvaluationRubric: string
  successEvaluationRequestTimeoutSeconds: number
  structuredDataPrompt: string
  structuredDataSchema: {
    type: string
    items: Record<string, any>
    properties: Record<string, any>
    description: string
    required: string[]
  }
}

interface MessagePlan {
  idleMessages: string[]
  idleMessageMaxSpokenCount: number
  idleTimeoutSeconds: number
}

interface StartSpeakingPlan {
  waitSeconds: number
  smartEndpointingEnabled: boolean
  transcriptionEndpointingPlan: TranscriptionEndpointingPlan
}

interface TranscriptionEndpointingPlan {
  onPunctuationSeconds: number
  onNoPunctuationSeconds: number
  onNumberSeconds: number
}

interface StopSpeakingPlan {
  numWords: number
  voiceSeconds: number
  backoffSeconds: number
}

interface MonitorPlan {
  listenEnabled: boolean
  controlEnabled: boolean
}

interface AssistantOverrides extends Omit<Assistant, "name"> {
  variableValues: Record<string, any>
  name: string
}

interface Squad {
  name: string
  members: SquadMember[]
  membersOverrides: AssistantOverrides
}

interface SquadMember {
  assistantId: string
  assistant: Assistant
  assistantOverrides: AssistantOverrides
  assistantDestinations: AssistantDestination[]
}

interface AssistantDestination {
  type: string
  transferMode: string
  assistantName: string
  message: string
  description: string
}

export interface PhoneNumber {
  fallbackDestination: Destination
  twilioPhoneNumber: string
  twilioAccountSid: string
  twilioAuthToken: string
  name: string
  assistantId: string
  squadId: string
  serverUrl: string
  serverUrlSecret: string
  // <CHANGE> Added 'number' property to VapiPhoneNumberResponse interface
  number: string
  id: string
}

interface Customer {
  numberE164CheckEnabled: boolean
  extension: string | null
  number: string
  sipUri: string
  name: string
}

export interface CallLogParam {
  assistantId: string
  limit?: number
  createdAtGe: string
  createdAtLe: string
}

export interface CreateToolDTO {
  async: boolean
  messages: ToolMessage[]
  type: string
  function?: ToolFunction
  server: ToolServer
}

// <CHANGE> Added VapiPhoneNumberResponse interface with number property
export interface VapiPhoneNumberResponse {
  id: string
  number: string
  phoneNumber?: string
  location?: string
  country?: string
  friendlyName?: string
}

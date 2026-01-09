/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios"
import FormData from "form-data"

const VAPI_BASE_URL = "https://api.vapi.ai"
const VAPI_PRIVATE_KEY = process.env.VAPI_PRIVATE_KEY
const VAPI_PUBLIC_KEY = process.env.VAPI_PUBLIC_KEY
// const VAPI_CREDENTIAL_ID = process.env.VAPI_CREDENTIAL_ID

interface VapiPhoneNumberResponse {
  id: string
  phoneNumber: string
  location?: string
  country?: string
  friendlyName?: string
}

interface VapiVoiceResponse {
  vapiVoiceId: string
  name: string
  provider: string
  gender?: string
  language?: string
  accent?: string
}

interface VapiAssistantResponse {
  id: string
  name: string
}

export class VapiService {
  private apiKey: string

  constructor() {
    if (!VAPI_PRIVATE_KEY) {
      throw new Error("VAPI_PRIVATE_KEY environment variable is not set")
    }
    this.apiKey = VAPI_PRIVATE_KEY
  }

  async getAvailablePhoneNumbers(): Promise<VapiPhoneNumberResponse[]> {
    try {
      console.log("[v0] Fetching available phone numbers from VAPI")

      const response = await axios.get(`${VAPI_BASE_URL}/phone-number`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      })

      console.log("[v0] VAPI response status:", response.status)
      console.log("[v0] VAPI response data:", response.data)

      if (Array.isArray(response.data)) {
        return response.data
      }

      if (response.data && Array.isArray(response.data.items)) {
        return response.data.items
      }

      if (response.data && Array.isArray(response.data.phoneNumbers)) {
        return response.data.phoneNumbers
      }

      return response.data || []
    } catch (error: any) {
      console.error("[v0] Error fetching VAPI phone numbers:", error.message)
      console.error("[v0] VAPI API Response:", error.response?.data)
      return []
    }
  }

  async getAvailableVoices(gender?: "male" | "female"): Promise<VapiVoiceResponse[]> {
    try {
      const vapiPresetVoices = [
        // Male voices
        { vapiVoiceId: "Rohan", name: "Rohan", provider: "vapi", gender: "male", language: "en" },
        { vapiVoiceId: "Cole", name: "Cole", provider: "vapi", gender: "male", language: "en" },
        { vapiVoiceId: "Harry", name: "Harry", provider: "vapi", gender: "male", language: "en" },
        { vapiVoiceId: "Elliot", name: "Elliot", provider: "vapi", gender: "male", language: "en" },
        { vapiVoiceId: "Spencer", name: "Spencer", provider: "vapi", gender: "male", language: "en" },

        // Female voices
        { vapiVoiceId: "Neha", name: "Neha", provider: "vapi", gender: "female", language: "en" },
        { vapiVoiceId: "Hana", name: "Hana", provider: "vapi", gender: "female", language: "en" },
        { vapiVoiceId: "Kylie", name: "Kylie", provider: "vapi", gender: "female", language: "en" },
        { vapiVoiceId: "Lily", name: "Lily", provider: "vapi", gender: "female", language: "en" },
        { vapiVoiceId: "Savannah", name: "Savannah", provider: "vapi", gender: "female", language: "en" },
        { vapiVoiceId: "Paige", name: "Paige", provider: "vapi", gender: "female", language: "en" },
        { vapiVoiceId: "Leah", name: "Leah", provider: "vapi", gender: "female", language: "en" },
        { vapiVoiceId: "Tara", name: "Tara", provider: "vapi", gender: "female", language: "en" },
      ]

      console.log("[v0] Using VAPI preset voices")

      let voices = vapiPresetVoices

      if (gender) {
        voices = voices.filter((voice) => voice.gender?.toLowerCase() === gender.toLowerCase())
      }

      return voices
    } catch (error: any) {
      console.error("[v0] Error with VAPI voices:", error.message)
      return []
    }
  }

  async getVoiceDetails(voiceId: string): Promise<VapiVoiceResponse> {
    try {
      const voiceMap: { [key: string]: VapiVoiceResponse } = {
        rohan: { vapiVoiceId: "Rohan", name: "Rohan", provider: "vapi", gender: "male", language: "en" },
        cole: { vapiVoiceId: "Cole", name: "Cole", provider: "vapi", gender: "male", language: "en" },
        harry: { vapiVoiceId: "Harry", name: "Harry", provider: "vapi", gender: "male", language: "en" },
        elliot: { vapiVoiceId: "Elliot", name: "Elliot", provider: "vapi", gender: "male", language: "en" },
        spencer: { vapiVoiceId: "Spencer", name: "Spencer", provider: "vapi", gender: "male", language: "en" },
        neha: { vapiVoiceId: "Neha", name: "Neha", provider: "vapi", gender: "female", language: "en" },
        hana: { vapiVoiceId: "Hana", name: "Hana", provider: "vapi", gender: "female", language: "en" },
        kylie: { vapiVoiceId: "Kylie", name: "Kylie", provider: "vapi", gender: "female", language: "en" },
        lily: { vapiVoiceId: "Lily", name: "Lily", provider: "vapi", gender: "female", language: "en" },
        savannah: { vapiVoiceId: "Savannah", name: "Savannah", provider: "vapi", gender: "female", language: "en" },
        paige: { vapiVoiceId: "Paige", name: "Paige", provider: "vapi", gender: "female", language: "en" },
        leah: { vapiVoiceId: "Leah", name: "Leah", provider: "vapi", gender: "female", language: "en" },
        tara: { vapiVoiceId: "Tara", name: "Tara", provider: "vapi", gender: "female", language: "en" },
      }

      const voice = voiceMap[voiceId.toLowerCase()]
      if (!voice) {
        throw new Error(`Voice ${voiceId} not found`)
      }
      return voice
    } catch (error: any) {
      console.error("[v0] Error fetching voice details:", error.message)
      throw new Error(`Failed to fetch details for voice ${voiceId}`)
    }
  }

  /**
   * Purchase/claim a phone number from VAPI
   * VAPI will automatically assign an available phone number from their pool
   */
  async purchasePhoneNumber(phoneNumber: string): Promise<string> {
    try {
      console.log("[v0] Requesting phone number from VAPI (any available number)")

      const response = await axios.post(
        `${VAPI_BASE_URL}/phone-number`,
        {
          provider: "vapi",
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        },
      )

      console.log("[v0] Phone number provisioned successfully from VAPI:", response.data)
      return response.data.id || response.data.phoneNumberId
    } catch (error: any) {
      console.error("[v0] Error purchasing phone number from VAPI:", error.response?.data || error.message)
      throw new Error(`Failed to purchase phone number: ${error.response?.data?.message || error.message}`)
    }
  }

  async createBYOPhoneNumber(number: string, credentialId: string, name: string): Promise<any> {
    try {
      console.log("[v0] Creating BYO phone number with VAPI:", { number, credentialId, name })

      const response = await axios.post(
        `${VAPI_BASE_URL}/phone-number`,
        {
          provider: "byo-phone-number",
          number,
          credentialId,
          name,
          numberE164CheckEnabled: true,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        },
      )

      console.log("[v0] BYO Phone number created successfully from VAPI:", response.data)
      return response.data
    } catch (error: any) {
      console.error("[v0] Error creating BYO phone number from VAPI:", error.response?.data || error.message)
      throw new Error(`Failed to create BYO phone number ${number}: ${error.response?.data?.message || error.message}`)
    }
  }

  /**
   * Release/delete a phone number
   */
  async releasePhoneNumber(phoneNumberId: string): Promise<boolean> {
    try {
      await axios.delete(`${VAPI_BASE_URL}/phone-number/${phoneNumberId}`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      })

      return true
    } catch (error) {
      console.error("[v0] Error releasing phone number from VAPI:", error)
      throw new Error(`Failed to release phone number ${phoneNumberId}`)
    }
  }

  /**
   * Get details of a specific phone number
   */
  async getPhoneNumberDetails(phoneNumberId: string): Promise<VapiPhoneNumberResponse> {
    try {
      const response = await axios.get(`${VAPI_BASE_URL}/phone-number/${phoneNumberId}`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      })

      return response.data
    } catch (error) {
      console.error("[v0] Error fetching phone number details:", error)
      throw new Error(`Failed to fetch details for phone number ${phoneNumberId}`)
    }
  }

  /**
   * Check if a phone number exists in VAPI
   */
  async checkPhoneNumberExists(phoneNumberId: string): Promise<boolean> {
    try {
      console.log("[v0] Checking if phone number exists:", phoneNumberId)

      const response = await axios.get(`${VAPI_BASE_URL}/phone-number/${phoneNumberId}`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      })

      console.log("[v0] Phone number exists:", response.data)
      return true
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log("[v0] Phone number not found:", phoneNumberId)
        return false
      }
      throw error
    }
  }

  /**
   * Attach an assistant to a phone number via PATCH /phone-number/{id}
   * This is the correct way to wire up a phone number to an assistant per VAPI docs
   */
  async attachAssistantToPhoneNumber(phoneNumberId: string, assistantId: string): Promise<any> {
    try {
      console.log("[v0] Attaching assistant to phone number:", {
        phoneNumberId,
        assistantId,
      })

      const phoneNumberExists = await this.checkPhoneNumberExists(phoneNumberId)
      if (!phoneNumberExists) {
        throw new Error(
          `Phone number with ID "${phoneNumberId}" not found in your VAPI account. Please verify the phone number ID and try again.`,
        )
      }

      const response = await axios.patch(
        `${VAPI_BASE_URL}/phone-number/${phoneNumberId}`,
        {
          assistantId,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        },
      )

      console.log("[v0] Assistant attached to phone number successfully:", response.data)
      return response.data
    } catch (error: any) {
      console.error("[v0] Error attaching assistant to phone number:", error.response?.data || error.message)
      throw new Error(`Failed to attach assistant to phone number: ${error.response?.data?.message || error.message}`)
    }
  }

  /**
   * Create an assistant (without phone number)
   */
  async createAssistant(name: string, voiceId: string, systemPrompt?: string): Promise<VapiAssistantResponse> {
    try {
      console.log("[v0] Creating VAPI assistant with:", {
        name,
        voiceId,
        systemPrompt: systemPrompt?.substring(0, 50),
      })

      const response = await axios.post(
        `${VAPI_BASE_URL}/assistant`,
        {
          name,
          model: {
            provider: "openai",
            model: "gpt-3.5-turbo",
          },
          voice: {
            provider: "vapi",
            voiceId,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        },
      )

      console.log("[v0] VAPI assistant created successfully:", response.data)
      return response.data
    } catch (error: any) {
      console.error("[v0] Error creating VAPI assistant:", {
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.response?.data?.message,
        error: error.response?.data?.error,
        details: error.response?.data,
      })
      throw new Error(`Failed to create assistant: ${error.response?.data?.message || error.message}`)
    }
  }

  /**
   * Updated to not include phoneNumberId - attach separately after creation
   */
  async updateAssistant(
    assistantId: string,
    name: string,
    voiceId: string,
    p0?: string,
    // systemPrompt?: string,
  ): Promise<VapiAssistantResponse> {
    try {
      console.log("[v0] Updating VAPI assistant:", {
        assistantId,
        name,
        voiceId,
      })

      const response = await axios.patch(
        `${VAPI_BASE_URL}/assistant/${assistantId}`,
        {
          name,
          model: {
            provider: "openai",
            model: "gpt-3.5-turbo",
          },
          voice: {
            provider: "vapi",
            voiceId,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        },
      )

      console.log("[v0] VAPI assistant updated successfully:", response.data)
      return response.data
    } catch (error: any) {
      console.error("[v0] Error updating VAPI assistant:", {
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.response?.data?.message,
        error: error.response?.data?.error,
        details: error.response?.data,
      })
      throw new Error(`Failed to update assistant: ${error.response?.data?.message || error.message}`)
    }
  }

  /**
   * Assign / connect a purchased phone number to an assistant
   */
  async assignPhoneNumberToAssistant(assistantId: string, phoneNumberId: string): Promise<any> {
    try {
      console.log("[v0] Assigning phone number to assistant:", {
        assistantId,
        phoneNumberId,
      })

      const response = await axios.patch(
        `${VAPI_BASE_URL}/assistant/${assistantId}`,
        {
          phoneNumberId,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        },
      )

      console.log("[v0] Phone number assigned successfully:", response.data)
      return response.data
    } catch (error: any) {
      console.error("[v0] Error assigning phone number:", error.response?.data)
      throw new Error(`Failed to assign phone number: ${error.response?.data?.message || error.message}`)
    }
  }

  async getCallLogs(assistantId: string, limit = 50) {
    try {
      console.log("[v0] Fetching call logs from VAPI for assistantId:", assistantId)

      const response = await axios.get(`${VAPI_BASE_URL}/call`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        params: {
          assistantId,
          limit,
        },
      })

      console.log("[v0] VAPI call logs fetched successfully")
      return response.data
    } catch (error: any) {
      console.error("[v0] Error fetching VAPI call logs:", {
        status: error.response?.status,
        message: error.response?.data?.message,
      })
      throw new Error(`Failed to fetch call logs: ${error.response?.data?.message || error.message}`)
    }
  }

  async getCallById(callId: string) {
    try {
      console.log("[v0] Fetching single call from VAPI with callId:", callId)

      const response = await axios.get(`${VAPI_BASE_URL}/call/${callId}`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      })

      console.log("[v0] VAPI call details fetched successfully")
      return response.data
    } catch (error: any) {
      console.error("[v0] Error fetching VAPI call details:", {
        status: error.response?.status,
        message: error.response?.data?.message,
      })
      throw new Error(`Failed to fetch call details: ${error.response?.data?.message || error.message}`)
    }
  }

  /**
   * Get the public key for frontend use
   */
  getPublicKey(): string {
    return VAPI_PUBLIC_KEY || ""
  }

  /**
   * Validate if a voiceId is one of the valid VAPI voices
   */
  isValidVoiceId(voiceId: string): boolean {
    const validVoices = [
      "Elliot",
      "Kylie",
      "Rohan",
      "Lily",
      "Savannah",
      "Hana",
      "Neha",
      "Cole",
      "Harry",
      "Paige",
      "Spencer",
      "Leah",
      "Tara",
    ]
    return validVoices.includes(voiceId)
  }

  /**
   * Upload a knowledge base file to VAPI (PDF, TXT, MD)
   */
  async uploadKnowledgeBaseFile(file: Buffer, fileName: string): Promise<string> {
    try {
      console.log("[v0] Uploading file to VAPI:", fileName)

      const formData = new FormData()
      formData.append("file", file, fileName)

      const response = await axios.post(`${VAPI_BASE_URL}/file`, formData, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          ...formData.getHeaders(),
        },
      })

      console.log("[v0] File uploaded successfully:", response.data.id)
      return response.data.id
    } catch (error: any) {
      console.error("[v0] Error uploading file:", error.response?.data || error.message)
      throw new Error(`Failed to upload file: ${error.response?.data?.message || error.message}`)
    }
  }

  /**
   * Create a knowledge base from an uploaded file
   */
  async createKnowledgeBase(fileId: string, name: string): Promise<string> {
    try {
      console.log("[v0] Creating Query Tool from uploaded file:", {
        fileId,
        name,
      })

      const toolId = await this.createQueryTool([fileId], "knowledge-search", name)

      return toolId
    } catch (error: any) {
      console.error("[v0] Error creating Query Tool:", error.response?.data || error.message)
      throw new Error(`Failed to create Query Tool: ${error.response?.data?.message || error.message}`)
    }
  }

  /**
   * Attach knowledge base to an existing assistant
   */
  async attachKnowledgeToAssistant(assistantId: string, toolId: string): Promise<any> {
    try {
      console.log("[v0] Attaching Query Tool to assistant:", {
        assistantId,
        toolId,
      })

      return await this.attachToolToAssistant(assistantId, toolId)
    } catch (error: any) {
      console.error("[v0] Error attaching tool to assistant:", error.response?.data || error.message)
      throw new Error(`Failed to attach tool to assistant: ${error.response?.data?.message || error.message}`)
    }
  }

  /**
   * Create a new assistant with knowledge base already attached
   */
  async createAssistantWithKnowledge(
    name: string,
    phoneNumberId: string,
    voiceId: string,
    toolId: string,
    systemPrompt?: string,
  ): Promise<VapiAssistantResponse> {
    try {
      console.log("[v0] Creating assistant with Query Tool:", {
        name,
        phoneNumberId,
        voiceId,
        toolId,
      })

      const response = await axios.post(
        `${VAPI_BASE_URL}/assistant`,
        {
          name,
          phoneNumberId,
          model: {
            provider: "openai",
            model: "gpt-3.5-turbo",
            messages: [
              {
                role: "system",
                content:
                  systemPrompt ||
                  "You are a helpful AI assistant. When users ask about products, services, or company information, use the knowledge-search tool to find accurate information.",
              },
            ],
            toolIds: [toolId],
          },
          voice: {
            provider: "vapi",
            voiceId,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        },
      )

      console.log("[v0] Assistant with Query Tool created successfully:", response.data.id)
      return response.data
    } catch (error: any) {
      console.error("[v0] Error creating assistant with tool:", error.response?.data || error.message)
      throw new Error(`Failed to create assistant with tool: ${error.response?.data?.message || error.message}`)
    }
  }

  /**
   * Create a Query Tool with knowledge base files
   */
  async createQueryTool(
    fileIds: string[],
    toolName = "knowledge-search",
    description = "Search knowledge base for information",
  ): Promise<string> {
    try {
      console.log("[v0] Creating Query Tool in VAPI:", {
        fileIds,
        toolName,
        description,
      })

      const response = await axios.post(
        `${VAPI_BASE_URL}/tool`,
        {
          type: "query",
          function: {
            name: toolName,
          },
          knowledgeBases: [
            {
              provider: "google",
              name: toolName,
              description,
              fileIds,
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        },
      )

      console.log("[v0] Query Tool created successfully:", response.data.id)
      return response.data.id
    } catch (error: any) {
      console.error("[v0] Error creating Query Tool:", error.response?.data || error.message)
      throw new Error(`Failed to create Query Tool: ${error.response?.data?.message || error.message}`)
    }
  }

  /**
   * Attach Query Tool to an existing assistant
   */
  async attachToolToAssistant(assistantId: string, toolId: string, systemPrompt?: string): Promise<any> {
    try {
      console.log("[v0] Attaching Query Tool to assistant:", {
        assistantId,
        toolId,
      })

      const existingAssistant = await axios.get(`${VAPI_BASE_URL}/assistant/${assistantId}`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      })

      const existingToolIds = existingAssistant.data.model?.toolIds || []
      const updatedToolIds = [...new Set([...existingToolIds, toolId])]

      const updatePayload: any = {
        model: {
          ...existingAssistant.data.model,
          toolIds: updatedToolIds,
          knowledgeBaseId: null,
        },
      }

      if (systemPrompt) {
        updatePayload.model.messages = [
          {
            role: "system",
            content: systemPrompt,
          },
        ]
      } else if (!existingAssistant.data.model?.messages) {
        updatePayload.model.messages = [
          {
            role: "system",
            content:
              "When users ask about our products, services, or company information, use the knowledge-search tool to find accurate information from our knowledge base.",
          },
        ]
      }

      const response = await axios.patch(`${VAPI_BASE_URL}/assistant/${assistantId}`, updatePayload, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      })

      console.log("[v0] Query Tool attached to assistant successfully")
      return response.data
    } catch (error: any) {
      console.error("[v0] Error attaching tool to assistant:", error.response?.data || error.message)
      throw new Error(`Failed to attach tool to assistant: ${error.response?.data?.message || error.message}`)
    }
  }

  async getVapiAssistant(assistantId: string): Promise<any> {
    try {
      const response = await axios.get(`${VAPI_BASE_URL}/assistant/${assistantId}`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      })
      return response.data
    } catch (error: any) {
      console.error("[v0] Error getting VAPI assistant:", error.response?.data || error.message)
      throw new Error(`Failed to get assistant: ${error.response?.data?.message || error.message}`)
    }
  }

  async deleteVapiAssistant(assistantId: string): Promise<any> {
    try {
      const response = await axios.delete(`${VAPI_BASE_URL}/assistant/${assistantId}`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      })
      return response.data
    } catch (error: any) {
      console.error("[v0] Error deleting VAPI assistant:", error.response?.data || error.message)
      throw new Error(`Failed to delete assistant: ${error.response?.data?.message || error.message}`)
    }
  }

  async createVapiTool(data: any): Promise<any> {
    try {
      const response = await axios.post(
        `${VAPI_BASE_URL}/tools`,
        {
          type: data.type,
          metadata: {
            scenarioId: data.scenarioId,
          },
          function: {
            name: data.name,
            strict: true,
            description: data.description,
            parameters: data.parameters,
          },
          server: {
            url: data.url,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        },
      )
      return response.data
    } catch (error: any) {
      console.error("[v0] Error creating VAPI tool:", error.response?.data || error.message)
      throw new Error(`Failed to create tool: ${error.response?.data?.message || error.message}`)
    }
  }

  async updateVapiAssistantTools(assistantId: string, toolIds: string[]): Promise<any> {
    try {
      const response = await axios.patch(
        `${VAPI_BASE_URL}/assistant/${assistantId}`,
        {
          model: {
            toolIds,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        },
      )
      return response.data
    } catch (error: any) {
      console.error("[v0] Error updating VAPI assistant tools:", error.response?.data || error.message)
      throw new Error(`Failed to update assistant tools: ${error.response?.data?.message || error.message}`)
    }
  }

  async getVapiCalls(params: any): Promise<any> {
    try {
      const response = await axios.get(`${VAPI_BASE_URL}/call`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        params,
      })
      return response.data
    } catch (error: any) {
      console.error("[v0] Error getting VAPI calls:", error.response?.data || error.message)
      throw new Error(`Failed to get calls: ${error.response?.data?.message || error.message}`)
    }
  }

  async getVapiCall(callId: string): Promise<any> {
    try {
      const response = await axios.get(`${VAPI_BASE_URL}/call/${callId}`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      })
      return response.data
    } catch (error: any) {
      console.error("[v0] Error getting VAPI call:", error.response?.data || error.message)
      throw new Error(`Failed to get call: ${error.response?.data?.message || error.message}`)
    }
  }

  async createVapiKnowledgeBase(data: any): Promise<any> {
    try {
      const response = await axios.post(`${VAPI_BASE_URL}/knowledge-base`, data, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      })
      return response.data
    } catch (error: any) {
      console.error("[v0] Error creating VAPI knowledge base:", error.response?.data || error.message)
      throw new Error(`Failed to create knowledge base: ${error.response?.data?.message || error.message}`)
    }
  }

  async deleteVapiKnowledgeBase(knowledgeBaseId: string): Promise<any> {
    try {
      const response = await axios.delete(`${VAPI_BASE_URL}/knowledge-base/${knowledgeBaseId}`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      })
      return response.data
    } catch (error: any) {
      console.error("[v0] Error deleting VAPI knowledge base:", error.response?.data || error.message)
      throw new Error(`Failed to delete knowledge base: ${error.response?.data?.message || error.message}`)
    }
  }

  async getVapiPhoneNumbers(): Promise<any> {
    try {
      const response = await axios.get(`${VAPI_BASE_URL}/phone-number`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      })
      return response.data
    } catch (error: any) {
      console.error("[v0] Error getting VAPI phone numbers:", error.response?.data || error.message)
      throw new Error(`Failed to get phone numbers: ${error.response?.data?.message || error.message}`)
    }
  }
}

export const vapiService = new VapiService()

export type Language = 'fa' | 'en'

export type SpeechToTextModel = {
  id: string
  name: Record<Language, string>
  icon: string
  category_id: 'speech_to_text'
}

export type ModelsResponse = {
  categories: Array<{
    id: string
    name: Record<Language, string>
    enabled: boolean
    models: SpeechToTextModel[]
  }>
  models: SpeechToTextModel[]
}

export type ModelId = string

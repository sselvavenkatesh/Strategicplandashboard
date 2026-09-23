export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      admin_users: {
        Row: { "Created At": string; created_at: string; Email: string | null; id: number; "Is Active": boolean; Name: string | null; Role: string; "User ID": string | null }
        Insert: { "Created At"?: string; created_at?: string; Email?: string | null; id?: number; "Is Active"?: boolean; Name?: string | null; Role?: string; "User ID"?: string | null }
        Update: { "Created At"?: string; created_at?: string; Email?: string | null; id?: number; "Is Active"?: boolean; Name?: string | null; Role?: string; "User ID"?: string | null }
        Relationships: []
      }
      Goal_master: {
        Row: { "Goal Description": string | null; "Goal ID": string; "Goal Name": string | null; Role: string; "Stakeholder ID": number | null; "Total Indicators": number | null; "Total Initiatives": number | null }
        Insert: { "Goal Description"?: string | null; "Goal ID": string; "Goal Name"?: string | null; Role?: string; "Stakeholder ID"?: number | null; "Total Indicators"?: number | null; "Total Initiatives"?: number | null }
        Update: { "Goal Description"?: string | null; "Goal ID"?: string; "Goal Name"?: string | null; Role?: string; "Stakeholder ID"?: number | null; "Total Indicators"?: number | null; "Total Initiatives"?: number | null }
        Relationships: []
      }
      Indicator_master: {
        Row: { "Goal ID": string | null; "Indicator ID": string; "Indicator Name": string | null; "Indicator Type": string | null; Role: string; "Stakeholder ID": number | null }
        Insert: { "Goal ID"?: string | null; "Indicator ID": string; "Indicator Name"?: string | null; "Indicator Type"?: string | null; Role?: string; "Stakeholder ID"?: number | null }
        Update: { "Goal ID"?: string | null; "Indicator ID"?: string; "Indicator Name"?: string | null; "Indicator Type"?: string | null; Role?: string; "Stakeholder ID"?: number | null }
        Relationships: []
      }
      Initiative_master: {
        Row: { "Goal ID": string | null; "Initiative ID": string; "Initiative Name": string | null; "Stakeholder ID": number | null; "Total Sub Initiatives": number | null }
        Insert: { "Goal ID"?: string | null; "Initiative ID": string; "Initiative Name"?: string | null; "Stakeholder ID"?: number | null; "Total Sub Initiatives"?: number | null }
        Update: { "Goal ID"?: string | null; "Initiative ID"?: string; "Initiative Name"?: string | null; "Stakeholder ID"?: number | null; "Total Sub Initiatives"?: number | null }
        Relationships: []
      }
      Indicator_Data: {
        Row: { Category: string; "Goal ID": string | null; "Goal Name": string | null; "Indicator ID": string; "Indicator Name": string; Role: string; School: string | null; "School Year": string; "Student Group": string; "Target 1": string | null; "Target 2": string | null; "Target 3": string | null; "Value 1": string | null; "Value 2": string | null; "Value 3": string | null }
        Insert: Database["public"]["Tables"]["Indicator_Data"]["Row"]
        Update: Partial<Database["public"]["Tables"]["Indicator_Data"]["Row"]>
        Relationships: []
      }
      Initiative_Data: {
        Row: { "Action Item": string; "End Date": string | null; "Goal ID": string | null; "Goal Name": string | null; "Initiative ID": string; "Initiative Name": string; School: string | null; "Stakeholder ID": number | null; "Start Date": string | null; Status: string | null; "Sub Initiative Name": string; "Target 1": string | null; "Target 2": string | null; "Target 3": string | null }
        Insert: Database["public"]["Tables"]["Initiative_Data"]["Row"]
        Update: Partial<Database["public"]["Tables"]["Initiative_Data"]["Row"]>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

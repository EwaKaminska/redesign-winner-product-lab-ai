// Data API used by the pages. Picks the backend at start-up:
// real Supabase when .env.local has keys, otherwise the local mock.

import * as supabaseApi from '@/lib/api.supabase'
import * as mockApi from '@/lib/api.mock'
import { isMockMode } from '@/lib/supabase'

const api = isMockMode ? mockApi : supabaseApi

export const {
  listInspirations,
  getInspiration,
  createInspiration,
  updateInspiration,
  setInspirationNote,
  setInspirationTags,
  deleteInspiration,
  listTags,
  getProfile,
  updateProfile,
  updatePassword,
} = api

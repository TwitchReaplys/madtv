import { createPlatformApi } from "@madtv/api";

import { supabase } from "./supabase";

export const api = createPlatformApi({
  supabase,
});

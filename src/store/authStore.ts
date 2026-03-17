import { supabase } from "@/lib/supabase";
import { createAuthStore } from "@steel-cut/steel-lib";

export const useAuthStore = createAuthStore(supabase);

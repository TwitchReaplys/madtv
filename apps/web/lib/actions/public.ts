"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getVerifiedAuthUser } from "@/lib/supabase/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { commentCreateSchema } from "@/lib/validators/schemas";

function redirectToPostWithMessage(
  creatorSlug: string,
  postId: string,
  kind: "commentError" | "commentSuccess",
  message: string,
): never {
  const params = new URLSearchParams();
  params.set(kind, message);
  redirect(`/c/${creatorSlug}/posts/${postId}?${params.toString()}#comments`);
}

export async function createCommentAction(formData: FormData) {
  const parsed = commentCreateSchema.safeParse({
    postId: formData.get("postId"),
    creatorSlug: formData.get("creatorSlug"),
    body: formData.get("body"),
  });

  const fallbackPostId = typeof formData.get("postId") === "string" ? String(formData.get("postId")) : "";
  const fallbackCreatorSlug = typeof formData.get("creatorSlug") === "string" ? String(formData.get("creatorSlug")) : "";

  if (!parsed.success) {
    if (fallbackPostId && fallbackCreatorSlug) {
      redirectToPostWithMessage(
        fallbackCreatorSlug,
        fallbackPostId,
        "commentError",
        parsed.error.issues[0]?.message ?? "Neplatný komentář.",
      );
    }

    redirect("/");
  }

  const supabase = await createServerSupabaseClient();
  const { user } = await getVerifiedAuthUser(supabase);

  if (!user) {
    redirect(`/login?next=/c/${parsed.data.creatorSlug}/posts/${parsed.data.postId}`);
  }

  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id, creator_id")
    .eq("id", parsed.data.postId)
    .maybeSingle();

  if (postError || !post) {
    redirectToPostWithMessage(parsed.data.creatorSlug, parsed.data.postId, "commentError", "Příspěvek není dostupný.");
  }

  const [{ data: rank }, { data: isAdmin }] = await Promise.all([
    supabase.rpc("active_subscription_rank", {
      p_creator_id: post.creator_id,
    }),
    supabase.rpc("is_creator_admin", {
      p_creator_id: post.creator_id,
    }),
  ]);

  const canComment = Number(rank ?? 0) >= 1 || Boolean(isAdmin);

  if (!canComment) {
    redirectToPostWithMessage(
      parsed.data.creatorSlug,
      parsed.data.postId,
      "commentError",
      "Komentovat mohou jen aktivní členové nebo správci tvůrce.",
    );
  }

  const { error: insertError } = await supabase.from("comments").insert({
    post_id: parsed.data.postId,
    user_id: user.id,
    body: parsed.data.body,
  });

  if (insertError) {
    redirectToPostWithMessage(parsed.data.creatorSlug, parsed.data.postId, "commentError", insertError.message);
  }

  revalidatePath(`/c/${parsed.data.creatorSlug}/posts/${parsed.data.postId}`);
  redirectToPostWithMessage(parsed.data.creatorSlug, parsed.data.postId, "commentSuccess", "Komentář byl přidán.");
}

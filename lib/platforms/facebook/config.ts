import { getMetaConfig } from "@/lib/platforms/instagram/config";

export { getMetaConfig };

/** Facebook Page OAuth scopes (Facebook Login for Business). */
export const FB_OAUTH_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_read_user_content",
  "pages_manage_posts",
  "read_insights",
  "business_management",
].join(",");

import { api } from "./axios";

export const draftDocument = (v: { docType: string; title: string; context: string }) =>
  api.post<{ text: string }>("/ai/draft", v).then((r) => r.data.text);

export const draftSocialPost = (v: { sourceText: string }) =>
  api.post<{ text: string }>("/ai/social-post", v).then((r) => r.data.text);

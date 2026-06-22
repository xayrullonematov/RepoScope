export interface CurrentUser {
  id: string;
  displayName: string;
  email: string;
  avatarColor: string;
  initials: string;
}

export const MOCK_USER: CurrentUser = {
  id: "local-user",
  displayName: "You",
  email: "you@local.dev",
  avatarColor: "violet",
  initials: "Y",
};

/** The only shape of a user ever sent to the client. Never includes passwordHash. */
export interface PublicUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

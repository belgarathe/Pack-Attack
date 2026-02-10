import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role: string;
      image?: string | null;
      twitchUsername?: string | null;
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    role: string;
    image?: string | null;
    twitchUsername?: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
    image?: string | null;
    twitchUsername?: string | null;
  }
}

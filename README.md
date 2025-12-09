# Pack Attack 🎴

  Magic: The Gathering box opening platform with battle system, admin dashboard, and user management.

## 🚀 Features

### User Features
- **Box Opening**: Open boxes and collect cards
- **Battle System**: Compete in battles with different modes:
  - Normal Mode: Highest total value wins
  - Upside-Down Mode: Lowest total value wins
  - Jackpot Mode: Highest single pull wins
  - Share Mode: Share rewards among participants
- **User Dashboard**: Track your collection, battles, and stats
- **Coin System**: Manage your coin balance

### Admin Features
- **Box Management**: Create and manage boxes
- **Admin Dashboard**: View platform statistics
- **Battle Management**: Monitor all battles

## 🛠️ Tech Stack

- **Framework**: Next.js 16+ (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI

## 📋 Prerequisites

- Node.js 18+ installed
- PostgreSQL installed and running
- npm or yarn package manager

## 🔧 Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Database Setup

Create a PostgreSQL database:

```bash
createdb packattack
```

Or use your preferred method to create the database.

### 3. Environment Variables

Create a `.env` file in the root directory (copy from `.env.example`):

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/packattack"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-a-secure-random-string-here"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

**Generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

### 4. Database Migration

```bash
# Push schema to database
npm run db:push

# Generate Prisma Client
npm run db:generate
```

### 5. Create Admin User

You can create an admin user through the registration page, then manually update the role in the database:

```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'your-admin@email.com';
```

Or use Prisma Studio:
```bash
npm run db:studio
```

### 6. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## 📁 Project Structure

```
Pack-Attack/
├── prisma/
│   └── schema.prisma      # Database schema
├── src/
│   ├── app/               # Next.js App Router pages
│   │   ├── (admin)/       # Admin routes
│   │   ├── (auth)/        # Authentication pages
│   │   ├── (dashboard)/   # User dashboard
│   │   ├── api/           # API routes
│   │   └── battles/      # Battle pages
│   ├── components/        # React components
│   │   └── ui/            # UI components
│   ├── lib/               # Utility functions
│   └── types/             # TypeScript types
├── public/                # Static assets
└── package.json           # Dependencies and scripts
```

## 📝 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate Prisma Client
- `npm run db:push` - Push schema to database
- `npm run db:studio` - Open Prisma Studio

## 🎮 Usage

### For Users

1. **Register/Login**: Create an account or login
2. **Browse Boxes**: View available boxes to open
3. **Join Battles**: Participate in battles with other players
4. **Create Battles**: Set up your own battles with custom settings
5. **View Dashboard**: Track your collection and stats

### For Admins

1. **Access Admin Dashboard**: Navigate to `/admin`
2. **Create Boxes**: Add new boxes with cards
3. **Manage Platform**: View statistics and manage content

## 🔐 Battle Modes

- **Normal**: Highest total coin value across all rounds wins
- **Upside-Down**: Lowest total coin value wins
- **Jackpot**: Highest single pull value wins
- **Share Mode**: Rewards are shared among participants

## 📄 License

This project is private and proprietary.

---

Built with ❤️ using Next.js, Prisma, and TypeScript


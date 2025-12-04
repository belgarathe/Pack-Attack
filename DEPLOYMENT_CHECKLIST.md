# Pack Attack - Production Deployment Checklist

## Pre-Deployment Requirements

### ✅ Environment Variables
Create a `.env` file in the root directory with the following:

```env
# Database Configuration
DATABASE_URL="postgresql://username:password@host:5432/packattack"

# NextAuth Configuration
NEXTAUTH_URL="https://your-domain.com"  # Update with your production URL
NEXTAUTH_SECRET="generate-secure-32-char-minimum-secret"  # Generate with: openssl rand -base64 32

# Node Environment
NODE_ENV="production"
```

### ✅ Database Setup

1. **Create Production Database**
   ```bash
   # Run migrations
   npx prisma migrate deploy
   
   # Generate Prisma Client
   npx prisma generate
   ```

2. **Seed Initial Data**
   ```bash
   # Create admin user
   npm run create-admin
   ```

### ✅ Security Checklist

- [ ] Generate strong `NEXTAUTH_SECRET` (minimum 32 characters)
- [ ] Update `NEXTAUTH_URL` to production domain
- [ ] Use secure database connection with SSL
- [ ] Enable HTTPS on production server
- [ ] Set proper CORS headers if needed
- [ ] Review and remove all console.log statements
- [ ] Implement rate limiting on API endpoints
- [ ] Add input validation on all forms
- [ ] Sanitize user inputs to prevent XSS

### ✅ Build & Optimization

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Test production build locally**
   ```bash
   npm start
   ```

3. **Optimize images**
   - Consider using image CDN (Cloudinary, Imgix)
   - Implement lazy loading for card images
   - Use appropriate image formats (WebP, AVIF)

### ✅ Deployment Platforms

#### Option 1: Vercel (Recommended)
1. Connect GitHub repository
2. Set environment variables in Vercel dashboard
3. Deploy with automatic builds on push

#### Option 2: Railway/Render
1. Create PostgreSQL database
2. Deploy Next.js application
3. Set environment variables
4. Configure custom domain

#### Option 3: VPS (DigitalOcean, AWS, etc.)
```bash
# Install dependencies
npm ci --production

# Build application
npm run build

# Start with PM2
pm2 start npm --name "packattack" -- start
```

### ✅ Post-Deployment

- [ ] Test all critical user flows
- [ ] Verify database connections
- [ ] Check authentication flow
- [ ] Test payment processing (when implemented)
- [ ] Monitor error logs
- [ ] Set up analytics (Google Analytics, Vercel Analytics)
- [ ] Configure error tracking (Sentry)
- [ ] Set up database backups
- [ ] Configure monitoring alerts

## Production Configuration Updates Needed

### 1. Update Image Configuration
The current `next.config.ts` allows all image domains (`**`). For production, specify allowed domains:

```typescript
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: 'cards.scryfall.io',
    },
    {
      protocol: 'https',
      hostname: 'images.pokemontcg.io',
    },
    // Add other specific domains
  ],
}
```

### 2. Add Error Boundaries
Implement error boundaries to handle runtime errors gracefully.

### 3. Add Loading States
Ensure all async operations have proper loading states.

### 4. Implement Logging Service
Replace console.log with proper logging service for production.

### 5. Add Database Connection Pooling
Configure Prisma for production with connection pooling.

## Environment-Specific Issues to Address

### Console Statements
Found console.log statements in 33 files that should be removed or replaced with proper logging.

### API Security
- Add rate limiting to prevent abuse
- Implement request validation
- Add API authentication where needed

### Performance Optimizations
- Enable caching for static assets
- Implement database query optimization
- Add pagination to large data sets
- Consider implementing Redis for session storage

## Monitoring & Analytics

### Recommended Services
- **Error Tracking**: Sentry, LogRocket
- **Analytics**: Google Analytics, Vercel Analytics
- **Performance**: Lighthouse CI, Web Vitals
- **Uptime**: UptimeRobot, Pingdom

## Backup Strategy

1. **Database Backups**
   - Daily automated backups
   - Store backups in separate location
   - Test restore process regularly

2. **Code Backups**
   - Use Git for version control
   - Tag releases properly
   - Maintain staging environment

## Support & Maintenance

- Set up email notifications for errors
- Create admin dashboard for monitoring
- Document API endpoints
- Create user documentation

## Final Steps Before Going Live

1. [ ] Run full security audit
2. [ ] Performance testing
3. [ ] Cross-browser testing
4. [ ] Mobile responsiveness check
5. [ ] SEO optimization
6. [ ] Legal compliance (Privacy Policy, Terms of Service)
7. [ ] Set up customer support channel

## Quick Deploy Commands

```bash
# Install dependencies
npm ci

# Run database migrations
npx prisma migrate deploy

# Build application
npm run build

# Start production server
npm start
```

---

**Note**: This checklist covers the essential items for deployment. Adjust based on your specific hosting platform and requirements.

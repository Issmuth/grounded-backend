# Deployment Checklist

Use this checklist to ensure a smooth deployment to production.

## Pre-Deployment

### Code & Configuration

- [ ] All code committed to Git
- [ ] `.env` file NOT committed (in `.gitignore`)
- [ ] `.env.example` updated with all required variables
- [ ] TypeScript compiles without errors (`npm run build`)
- [ ] All tests passing (if you have tests)
- [ ] No console.log statements in production code
- [ ] Error handling implemented for all routes
- [ ] CORS configured with production domains

### Database

- [ ] Supabase project created
- [ ] Database credentials saved securely
- [ ] All migrations run successfully
- [ ] Database tables verified in Supabase dashboard
- [ ] Indexes created on frequently queried columns
- [ ] Sample data tested (if applicable)

### Firebase

- [ ] Firebase project created
- [ ] Service account credentials downloaded
- [ ] Firebase Admin SDK initialized correctly
- [ ] Authentication tested with real tokens
- [ ] Service account has necessary permissions

### Security

- [ ] Strong database password set
- [ ] Firebase private key secured
- [ ] ALLOWED_ORIGINS configured for production domains
- [ ] No sensitive data in code
- [ ] Environment variables documented
- [ ] SSL/HTTPS enabled (automatic with Supabase)

## Deployment Platform Setup

### Vercel

- [ ] Vercel account created
- [ ] Repository connected to Vercel
- [ ] Build command set: `npm run build`
- [ ] Output directory set: `dist`
- [ ] Start command set: `npm start`
- [ ] All environment variables added
- [ ] `vercel.json` configured
- [ ] Custom domain configured (optional)

### Railway

- [ ] Railway account created
- [ ] Railway CLI installed
- [ ] Project initialized
- [ ] All environment variables set
- [ ] Domain configured
- [ ] Deployment tested

### Render

- [ ] Render account created
- [ ] Repository connected
- [ ] Build command: `npm install && npm run build`
- [ ] Start command: `npm start`
- [ ] Environment variables added
- [ ] Health check path set: `/health`
- [ ] Custom domain configured (optional)

### Traditional Hosting (cPanel)

- [ ] Node.js support enabled
- [ ] Files uploaded to server
- [ ] Dependencies installed
- [ ] Environment variables configured
- [ ] Application startup file set: `dist/server.js`
- [ ] SSL certificate installed
- [ ] Domain/subdomain configured

## Environment Variables

Verify all these are set in production:

- [ ] `NODE_ENV=production`
- [ ] `PORT` (or use platform default)
- [ ] `DB_HOST` (Supabase host)
- [ ] `DB_PORT=5432`
- [ ] `DB_NAME=postgres`
- [ ] `DB_USER=postgres`
- [ ] `DB_PASSWORD` (Supabase password)
- [ ] `DATABASE_URL` (full connection string)
- [ ] `FIREBASE_PROJECT_ID`
- [ ] `FIREBASE_CLIENT_EMAIL`
- [ ] `FIREBASE_PRIVATE_KEY` (with proper newlines)
- [ ] `ALLOWED_ORIGINS` (production domains)

## Post-Deployment

### Verification

- [ ] Deployment successful (no errors)
- [ ] Application is running
- [ ] Health check endpoint working: `GET /health`
- [ ] Returns 200 status code
- [ ] Database connection status: "connected"
- [ ] Server uptime showing

### API Testing

- [ ] Health check: `curl https://your-api.com/health`
- [ ] User creation with Firebase token
- [ ] User retrieval with Firebase token
- [ ] Error responses formatted correctly
- [ ] CORS working from mobile app
- [ ] Response times acceptable

### Monitoring Setup

- [ ] Health check monitoring configured (UptimeRobot, etc.)
- [ ] Error logging reviewed
- [ ] Application logs accessible
- [ ] Supabase dashboard checked
- [ ] Alert notifications configured

### Documentation

- [ ] Production URL documented
- [ ] API endpoints documented
- [ ] Environment variables documented
- [ ] Deployment process documented
- [ ] Rollback procedure documented

## Mobile App Integration

- [ ] API URL updated in mobile app
- [ ] Firebase configuration matches
- [ ] CORS origins include mobile app domains
- [ ] Authentication flow tested end-to-end
- [ ] User creation tested from mobile app
- [ ] User data retrieval tested
- [ ] Error handling tested

## Performance

- [ ] Response times measured
- [ ] Database query performance checked
- [ ] Connection pool size appropriate
- [ ] No memory leaks detected
- [ ] CPU usage normal
- [ ] Bandwidth usage monitored

## Security

- [ ] HTTPS enabled (check SSL certificate)
- [ ] CORS properly configured
- [ ] No sensitive data in logs
- [ ] Rate limiting considered (if needed)
- [ ] SQL injection prevention verified
- [ ] Authentication working correctly
- [ ] Error messages don't leak sensitive info

## Backup & Recovery

- [ ] Supabase backups enabled (Pro plan)
- [ ] Manual backup created
- [ ] Backup restoration tested
- [ ] Code backed up in Git
- [ ] Environment variables backed up securely
- [ ] Recovery procedure documented

## Scaling Preparation

- [ ] Current resource usage noted
- [ ] Scaling plan documented
- [ ] Database upgrade path known
- [ ] Connection pool limits understood
- [ ] Monitoring thresholds set

## Final Checks

- [ ] All team members notified
- [ ] Documentation updated
- [ ] Changelog updated
- [ ] Version tagged in Git
- [ ] Production URL shared
- [ ] Support contacts documented

## Rollback Plan

In case something goes wrong:

- [ ] Previous version tagged in Git
- [ ] Rollback procedure documented
- [ ] Database backup available
- [ ] Quick rollback tested
- [ ] Team knows rollback process

## Post-Launch Monitoring (First 24 Hours)

- [ ] Hour 1: Check logs and metrics
- [ ] Hour 4: Verify no errors
- [ ] Hour 12: Check performance
- [ ] Hour 24: Full system review
- [ ] Monitor user feedback
- [ ] Check error rates
- [ ] Verify database performance

## Common Issues Checklist

If deployment fails, check:

- [ ] All environment variables set correctly
- [ ] Database connection string correct
- [ ] Firebase credentials valid
- [ ] Build completed successfully
- [ ] Dependencies installed
- [ ] Port configuration correct
- [ ] CORS origins include production domain
- [ ] SSL certificate valid

## Success Criteria

Deployment is successful when:

- ✅ Health check returns 200
- ✅ Database connection working
- ✅ Users can authenticate
- ✅ API endpoints responding
- ✅ No errors in logs
- ✅ Mobile app can connect
- ✅ Response times acceptable
- ✅ Monitoring active

## Next Steps After Deployment

1. Monitor for 24-48 hours
2. Gather user feedback
3. Check performance metrics
4. Plan next features
5. Schedule regular maintenance

## Emergency Contacts

Document these before deployment:

- **Hosting Support**: ******\_\_\_******
- **Supabase Support**: support@supabase.io
- **Firebase Support**: firebase.google.com/support
- **Team Lead**: ******\_\_\_******
- **On-Call Developer**: ******\_\_\_******

## Notes

Use this space for deployment-specific notes:

```
Deployment Date: _______________
Deployed By: _______________
Version: _______________
Platform: _______________
Issues Encountered: _______________
Resolution: _______________
```

---

**Remember**: It's better to catch issues before deployment than after. Take your time with this checklist!

Good luck with your deployment! 🚀

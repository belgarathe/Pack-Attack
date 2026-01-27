# Server Stability Protocol

## Executive Summary

This document outlines the stability issues identified and the fixes implemented to ensure reliable server operation for Pack Attack.

---

## Issues Identified

### 1. **CRITICAL: Database Retry Logic Not Used**
- **Problem**: The `withRetry` function in `prisma.ts` is defined but never called in any API routes
- **Impact**: Database connection errors crash routes instead of being gracefully retried
- **Fix**: Wrap critical database operations with `withRetry()`

### 2. **CRITICAL: No Global Error Handlers**
- **Problem**: Missing `unhandledRejection` and `uncaughtException` handlers
- **Impact**: Unhandled errors crash the entire Node.js process
- **Fix**: Add global error handlers in instrumentation file

### 3. **HIGH: Memory Leak in Rate Limiter**
- **Problem**: Rate limiter stores data in memory without size limits
- **Impact**: Under sustained load, memory usage grows unbounded
- **Fix**: Add maximum entries limit and proper cleanup

### 4. **HIGH: Database Connection Pool Not Configured**
- **Problem**: Prisma uses default connection pool settings
- **Impact**: Connection pool exhaustion under high load
- **Fix**: Configure connection pool limits in DATABASE_URL

### 5. **MEDIUM: No Request Timeout**
- **Problem**: Long-running requests can hang indefinitely
- **Impact**: Resource exhaustion, hung connections
- **Fix**: Add request timeout middleware

### 6. **MEDIUM: Battle Start Route Does Sequential DB Ops**
- **Problem**: Battle start makes many sequential DB calls without transaction
- **Impact**: Inconsistent state on partial failure, slow performance
- **Fix**: Wrap in transaction, optimize queries

### 7. **LOW: PM2 Configuration Suboptimal**
- **Problem**: Missing clustering, graceful reload, memory limits
- **Impact**: Single point of failure, harder recovery
- **Fix**: Update ecosystem.config.cjs

---

## Stability Checklist

### Before Deployment
- [ ] All environment variables configured
- [ ] DATABASE_URL includes connection pool parameters
- [ ] NEXTAUTH_SECRET is at least 32 characters
- [ ] PM2 ecosystem.config.cjs is up to date

### Monitoring
- [ ] Health endpoint accessible at `/api/health`
- [ ] PM2 logs monitored: `pm2 logs packattack`
- [ ] Database health checked periodically

### Emergency Procedures

#### Server Unresponsive
```bash
# Check PM2 status
pm2 status

# View recent logs
pm2 logs packattack --lines 100

# Restart application
pm2 restart packattack

# If still failing, reload with zero downtime
pm2 reload packattack
```

#### Database Connection Issues
```bash
# Check database connectivity
curl http://localhost:3000/api/health

# If database is down, check connection string
# Restart app after database is back
pm2 restart packattack
```

#### High Memory Usage
```bash
# Check memory
pm2 monit

# If memory is high, restart
pm2 restart packattack

# Check for memory leaks in logs
pm2 logs packattack | grep -i "memory\|heap"
```

---

## Recommended DATABASE_URL Format

```
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require&connection_limit=10&pool_timeout=30"
```

Parameters:
- `connection_limit=10`: Maximum connections in pool
- `pool_timeout=30`: Seconds to wait for available connection

---

## Health Endpoint Response

```json
{
  "status": "healthy|degraded|unhealthy",
  "timestamp": "2026-01-27T10:00:00.000Z",
  "uptime": 86400,
  "checks": {
    "database": {
      "status": "up|down",
      "latency": 15
    },
    "memory": {
      "used": 256,
      "total": 512,
      "percentage": 50
    }
  },
  "version": "1.0.0"
}
```

---

## Files Modified for Stability

1. `src/lib/prisma.ts` - Enhanced retry logic and connection handling
2. `src/lib/rate-limit.ts` - Memory leak fix
3. `src/instrumentation.ts` - Global error handlers (NEW)
4. `src/lib/api-utils.ts` - Request timeout utility (NEW)
5. `ecosystem.config.cjs` - PM2 stability improvements
6. `src/app/api/battles/[battleId]/start/route.ts` - Transaction optimization

---

## Version History

- **v1.0** (2026-01-27): Initial stability protocol and fixes

import axios from 'axios';
import { RedisClient } from '@/infrastructure/cache/redis-client';  // Fixed path
import { AlpacaService } from '@/infrastructure/external-apis/alpaca-service';  // Fixed path

const redis = RedisClient.getInstance();

// ... rest of the file remains the same
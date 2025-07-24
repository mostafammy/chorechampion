// Test your JWT functions
import { generateAccessToken, verifyAccessToken } from '@/lib/auth/jwt/jwt';

const testPayload = {
  id: 'test-user-id',
  email: 'test@example.com',
  role: 'user'
};

console.log('Testing JWT functions...');

try {
  // Generate token
  const token = generateAccessToken(testPayload);
  console.log('✅ Token generated successfully');
  console.log('Token length:', token.length);

  // Verify token
  const decoded = verifyAccessToken(token);
  console.log('✅ Token verified successfully');
  console.log('Decoded payload:', decoded);

  console.log('🎉 JWT functions are working correctly!');
} catch (error) {
  console.error('❌ JWT test failed:', error);
}

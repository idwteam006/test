'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Lock, ArrowLeft, CheckCircle2, AlertCircle, Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

function VerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [resending, setResending] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Get email and token from URL
    const emailParam = searchParams.get('email');
    const tokenParam = searchParams.get('token');

    // Only set email if it's a valid email (not "undefined" or empty)
    if (emailParam && emailParam !== 'undefined' && emailParam.includes('@')) {
      setEmail(emailParam);
    }

    // Only set token if it's a valid token (not "undefined", "null", or too short)
    if (tokenParam && tokenParam !== 'undefined' && tokenParam !== 'null' && tokenParam.length > 20) {
      setToken(tokenParam);
      toast.info('Magic link verified', {
        description: 'Please enter the 6-digit code from your email',
      });
    } else if (!tokenParam && !emailParam) {
      // No parameters - show helpful message
      toast.info('Enter your login code', {
        description: 'Check your email for the 6-digit code',
      });
    }

    // Focus first input
    inputRefs.current[0]?.focus();

    // Start initial countdown (60 seconds)
    setResendCountdown(60);
  }, [searchParams]);

  // Countdown timer effect
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => {
        setResendCountdown(resendCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  const handleCodeChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (newCode.every((digit) => digit !== '') && !loading) {
      handleSubmit(newCode.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();

    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split('');
      setCode(digits);
      inputRefs.current[5]?.focus();

      // Auto-submit
      setTimeout(() => handleSubmit(pastedData), 100);
    } else {
      toast.error('Invalid code format', {
        description: 'Please paste a 6-digit code',
      });
    }
  };

  const handleSubmit = async (codeToSubmit?: string) => {
    const finalCode = codeToSubmit || code.join('');

    if (finalCode.length !== 6) {
      toast.error('Please enter all 6 digits');
      return;
    }

    if (!token && !email) {
      toast.error('Missing verification information', {
        description: 'Please go back and request a new code',
      });
      return;
    }

    setLoading(true);

    // Show progress message
    const loadingToast = toast.loading('Verifying your code...', {
      description: 'Please wait while we authenticate you',
    });

    try {
      // Build request body - only include token OR email, not both
      const requestBody: { token?: string; email?: string; code: string } = {
        code: finalCode,
      };

      // Prefer token if available (must be valid - not "undefined" and > 20 chars), otherwise use email
      if (token && token !== 'undefined' && token !== 'null' && token.length > 20) {
        requestBody.token = token;
      } else if (email && email !== 'undefined' && email.includes('@')) {
        requestBody.email = email;
      }

      const response = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      // Dismiss loading toast
      toast.dismiss(loadingToast);

      if (response.ok && data.success) {
        toast.success('Login successful!', {
          description: `Welcome back, ${data.user.firstName}!`,
        });

        // Request location permission after successful login
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            () => {
              // Permission granted
              console.log('Location permission granted');
            },
            (error) => {
              // Permission denied or error - but don't block login
              console.log('Location permission:', error.message);
            },
            {
              enableHighAccuracy: true,
              timeout: 5000,
              maximumAge: 0,
            }
          );
        }

        // Redirect based on user role and department
        setTimeout(() => {
          const customRedirect = searchParams.get('redirect');
          if (customRedirect) {
            router.push(customRedirect);
          } else {
            // Determine redirect based on role and department
            let defaultRedirect = '/dashboard';

            if (data.user.role === 'SUPER_ADMIN') {
              defaultRedirect = '/super-admin';
            } else if (data.user.role === 'ADMIN') {
              // Check if HR department - redirect to HR dashboard
              if (data.user.department?.name === 'Human Resources') {
                defaultRedirect = '/hr/dashboard';
              } else {
                defaultRedirect = '/admin';
              }
            } else if (data.user.role === 'HR') {
              defaultRedirect = '/hr/dashboard';
            } else if (data.user.role === 'MANAGER') {
              defaultRedirect = '/manager/dashboard';
            } else if (data.user.role === 'EMPLOYEE') {
              defaultRedirect = '/employee/dashboard';
            } else if (data.user.role === 'ACCOUNTANT') {
              defaultRedirect = '/admin';
            }

            router.push(defaultRedirect);
          }
        }, 1000);
      } else {
        toast.error(data.error || 'Invalid verification code', {
          description: data.attemptsRemaining !== undefined
            ? `${data.attemptsRemaining} attempts remaining`
            : undefined,
        });

        // Clear code on error
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (error) {
      // Dismiss loading toast
      toast.dismiss(loadingToast);

      console.error('Verify code error:', error);
      toast.error('Network error', {
        description: 'Please check your connection and try again',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!email) {
      toast.error('Email address not found', {
        description: 'Please go back to login and try again',
      });
      return;
    }

    if (resendCountdown > 0) {
      toast.info('Please wait', {
        description: `You can resend the code in ${resendCountdown} seconds`,
      });
      return;
    }

    setResending(true);

    try {
      const response = await fetch('/api/auth/request-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('New code sent!', {
          description: 'Check your email for the new 6-digit code',
          duration: 5000,
        });

        // Reset countdown to 60 seconds
        setResendCountdown(60);

        // Clear existing code
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      } else {
        toast.error(data.error || 'Failed to resend code', {
          description: data.details ? JSON.stringify(data.details) : undefined,
        });
      }
    } catch (error) {
      console.error('Resend code error:', error);
      toast.error('Network error', {
        description: 'Please check your connection and try again',
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-purple-200/30 to-transparent rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [90, 0, 90],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-indigo-200/30 to-transparent rounded-full blur-3xl"
        />
      </div>

      {/* Verification Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <Card className="backdrop-blur-sm bg-white/90 shadow-2xl border-purple-100">
          <CardHeader className="space-y-1 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center"
            >
              <Lock className="w-8 h-8 text-white" />
            </motion.div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Enter Verification Code
            </CardTitle>
            <CardDescription className="text-base">
              {email ? (
                <>
                  We sent a 6-digit code to{' '}
                  <span className="font-medium text-purple-600">{email}</span>
                </>
              ) : (
                'Enter the 6-digit code from your email'
              )}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {verifying ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="w-12 h-12 animate-spin text-purple-600 mb-4" />
                <p className="text-gray-600">Verifying magic link...</p>
              </div>
            ) : (
              <>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-center block">
                      Verification Code
                    </Label>
                    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
                      {code.map((digit, index) => (
                        <motion.input
                          key={index}
                          ref={(el) => {
                            inputRefs.current[index] = el;
                          }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleCodeChange(index, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(index, e)}
                          disabled={loading}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: index * 0.05 }}
                          className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      ))}
                    </div>
                  </div>

                  <Button
                    onClick={() => handleSubmit()}
                    disabled={loading || code.some((d) => !d)}
                    className="w-full h-12 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        Verify & Login
                        <CheckCircle2 className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>
                </div>

                {/* Resend Code Section */}
                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-center gap-2 text-sm text-slate-600">
                    <span>Didn't receive the code?</span>
                    <Button
                      variant="link"
                      onClick={handleResendCode}
                      disabled={resending || resendCountdown > 0}
                      className="p-0 h-auto font-semibold text-purple-600 hover:text-purple-700"
                    >
                      {resending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          Sending...
                        </>
                      ) : resendCountdown > 0 ? (
                        `Resend in ${resendCountdown}s`
                      ) : (
                        'Resend Code'
                      )}
                    </Button>
                  </div>

                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                    <div className="flex items-start gap-3">
                      <Mail className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-purple-800">
                        <p className="font-medium mb-1">Tips:</p>
                        <ul className="space-y-1 text-purple-700">
                          <li>• Check your spam/junk folder</li>
                          <li>• Make sure you entered the correct email</li>
                          <li>• Wait a few moments for delivery</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Back Button */}
                <div className="mt-6 text-center">
                  <Button
                    variant="ghost"
                    onClick={() => router.push('/auth/login')}
                    className="text-gray-600 hover:text-purple-600"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Login
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center mt-6 text-sm text-gray-600">
          Your code expires in 10 minutes for security
        </p>
      </motion.div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-indigo-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-slate-600">Loading...</p>
          </div>
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}

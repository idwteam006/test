'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, Mail, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';

export default function OnboardingSuccessPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-700 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl w-full"
      >
        <Card className="border-0 shadow-2xl">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-3xl">Onboarding Submitted Successfully!</CardTitle>
            <CardDescription className="text-base">
              Your information has been submitted for HR review
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* What's Next */}
            <div className="bg-muted/50 rounded-lg p-6 space-y-4">
              <h3 className="font-semibold text-lg">What happens next?</h3>

              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 font-semibold text-sm">1</span>
                  </div>
                  <div>
                    <p className="font-medium">HR Review</p>
                    <p className="text-sm text-muted-foreground">
                      Our HR team will carefully review all the information you provided
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 font-semibold text-sm">2</span>
                  </div>
                  <div>
                    <p className="font-medium">Email Notification</p>
                    <p className="text-sm text-muted-foreground">
                      You'll receive an email once your onboarding is approved or if any changes are needed
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 font-semibold text-sm">3</span>
                  </div>
                  <div>
                    <p className="font-medium">Account Activation</p>
                    <p className="text-sm text-muted-foreground">
                      After approval, you'll gain full access to Zenora.ai with your work email
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Important Info */}
            <div className="border-l-4 border-yellow-500 bg-yellow-50 p-4 rounded">
              <div className="flex gap-2">
                <Clock className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-900">Expected Timeline</p>
                  <p className="text-sm text-yellow-800 mt-1">
                    The review process typically takes 1-2 business days. You'll receive an email notification
                    as soon as your onboarding is reviewed.
                  </p>
                </div>
              </div>
            </div>

            <div className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded">
              <div className="flex gap-2">
                <Mail className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900">Check Your Email</p>
                  <p className="text-sm text-blue-800 mt-1">
                    We've sent a confirmation email to your registered email address. Please check your inbox
                    (and spam folder) for updates.
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="text-center pt-4">
              <p className="text-sm text-muted-foreground mb-4">
                Have questions? Contact your HR department or the person who invited you.
              </p>

              <Button
                variant="outline"
                onClick={() => router.push('/login')}
              >
                Go to Login Page
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-white/80 text-sm mt-6">
          © {new Date().getFullYear()} Zenora.ai. All rights reserved.
        </p>
      </motion.div>
    </div>
  );
}

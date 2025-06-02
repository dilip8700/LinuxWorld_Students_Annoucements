"use client"

import type React from "react"
import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { getPlatformSettings } from "@/lib/firebase-utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { BookOpen, Upload, CheckCircle } from "lucide-react"
import Link from "next/link"

export default function SignUpPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    mobileNumber: "",
    profileImage: "",
  })
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [isAutoApproved, setIsAutoApproved] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const { signUp, authLoading } = useAuth()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setFormData((prev) => ({
          ...prev,
          profileImage: reader.result as string,
        }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    try {
      const userData = {
        email: formData.email,
        name: formData.name,
        mobileNumber: formData.mobileNumber,
        profileImage: formData.profileImage,
        role: "student" as const, // Explicitly set role to student
      }
      
      // Sign up the user
      await signUp(userData, formData.password)
      
      // Check if auto-approval is enabled
      const platformSettings = await getPlatformSettings()
      const autoApproved = platformSettings.autoApproveStudents || false
      
      console.log("Signup successful, auto-approval status:", autoApproved)
      
      setIsAutoApproved(autoApproved)
      setSuccess(true)
      
      // If auto-approved, redirect to dashboard after a brief delay
      if (autoApproved) {
        setRedirecting(true)
        setTimeout(() => {
          router.push("/dashboard")
        }, 2000) // 2 second delay to show success message
      }
    } catch (err: any) {
      setError(err.message || "Failed to create account")
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              {isAutoApproved ? (
                <CheckCircle className="h-12 w-12 text-green-600" />
              ) : (
                <BookOpen className="h-12 w-12 text-orange-600" />
              )}
            </div>
            <CardTitle className="text-2xl">
              {isAutoApproved ? "Welcome to LinuxWorld!" : "Registration Successful!"}
            </CardTitle>
            <CardDescription>
              {isAutoApproved ? (
                <>
                  Your account has been automatically approved! 
                  {redirecting ? " Redirecting to dashboard..." : " You can now access all student features."}
                </>
              ) : (
                "Your LinuxWorld account has been created and is pending approval from an administrator. You will receive an email once your account is approved."
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isAutoApproved ? (
              <div className="space-y-3">
                {redirecting ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <Button asChild className="w-full">
                    <Link href="/dashboard">Go to Dashboard</Link>
                  </Button>
                )}
              </div>
            ) : (
              <Button asChild className="w-full">
                <Link href="/auth/signin">Return to Sign In</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <BookOpen className="h-12 w-12 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Join LinuxWorld</CardTitle>
          <CardDescription>Create your LinuxWorld classroom account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-center">
              <div className="relative">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={formData.profileImage || "/placeholder.svg"} />
                  <AvatarFallback>{formData.name ? formData.name.charAt(0).toUpperCase() : "U"}</AvatarFallback>
                </Avatar>
                <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-1 rounded-full cursor-pointer hover:bg-blue-700">
                  <Upload className="h-3 w-3" />
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleInputChange}
                required
                placeholder="Enter your full name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                placeholder="Enter your email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mobileNumber">Mobile Number</Label>
              <Input
                id="mobileNumber"
                name="mobileNumber"
                type="tel"
                value={formData.mobileNumber}
                onChange={handleInputChange}
                placeholder="Enter your mobile number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                placeholder="Enter your password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
                placeholder="Confirm your password"
              />
            </div>

            <Button type="submit" className="w-full" disabled={authLoading}>
              {authLoading ? "Creating Account..." : "Create Account"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link href="/auth/signin" className="text-blue-600 hover:underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
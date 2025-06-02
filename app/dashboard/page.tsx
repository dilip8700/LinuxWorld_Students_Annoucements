



"use client"

import { useEffect, useState } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getAnnouncements, getUserGroups, markAnnouncementAsViewed } from "@/lib/firebase-utils"
import { useAuth } from "@/contexts/auth-context"
import type { Announcement, Group, User } from "@/types"
import { Users, MessageSquare, BookOpen, Calendar, Search, Download, Clock, ImageIcon, File, Video } from "lucide-react"
import { Timestamp } from "firebase/firestore"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

export default function DashboardPage() {
  const { user } = useAuth()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [filteredAnnouncements, setFilteredAnnouncements] = useState<Announcement[]>([])
  const [userGroups, setUserGroups] = useState<Group[]>([])
  const [allGroups, setAllGroups] = useState<Map<string, Group>>(new Map()) // Store all groups by ID
  const [userNames, setUserNames] = useState<Map<string, string>>(new Map()) // Store user names by ID
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user])

  useEffect(() => {
    // Filter announcements based on search query
    if (!searchQuery.trim()) {
      setFilteredAnnouncements(announcements)
    } else {
      const filtered = announcements.filter((announcement) => {
        const groupName = allGroups.get(announcement.groupId)?.name || ""
        const posterName = userNames.get(announcement.createdBy) || ""
        return (
          announcement.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          announcement.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          groupName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          posterName.toLowerCase().includes(searchQuery.toLowerCase())
        )
      })
      setFilteredAnnouncements(filtered)
    }
  }, [searchQuery, announcements, allGroups, userNames])

  const fetchData = async () => {
    if (!user) return

    try {
      // Get user's groups
      const groups = await getUserGroups(user.assignedGroups || [])
      setUserGroups(groups)
      
      // Create a map of all groups for quick lookup
      const groupsMap = new Map<string, Group>()
      groups.forEach(group => {
        groupsMap.set(group.id, group)
      })
      setAllGroups(groupsMap)

      // Get announcements for user's groups
      const groupIds = user.assignedGroups || []
      const announcementsData = await getAnnouncements(groupIds)
      setAnnouncements(announcementsData)

      // Fetch names for all users who created announcements
      const creatorIds = [...new Set(announcementsData.map(a => a.createdBy))]
      const namesMap = new Map<string, string>()
      
      for (const creatorId of creatorIds) {
        try {
          const userDoc = await getDoc(doc(db, "users", creatorId))
          if (userDoc.exists()) {
            const userData = userDoc.data() as User
            namesMap.set(creatorId, userData.name)
          }
        } catch (error) {
          console.error(`Error fetching user ${creatorId}:`, error)
        }
      }
      
      setUserNames(namesMap)

      // Mark announcements as viewed by this user (for students)
      if (user.role === "student" && announcementsData.length > 0) {
        const recentAnnouncements = announcementsData.slice(0, 10)
        for (const announcement of recentAnnouncements) {
          if (!announcement.viewedBy?.includes(user.id)) {
            await markAnnouncementAsViewed(announcement.id, user.id)
          }
        }
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  // Helper function to convert Firestore Timestamp to Date
  const toDate = (dateValue: Date | Timestamp | string | any): Date => {
    if (!dateValue) return new Date()
    
    if (dateValue instanceof Date) return dateValue
    
    if (dateValue instanceof Timestamp) return dateValue.toDate()
    
    if (dateValue && typeof dateValue === 'object' && 'toDate' in dateValue) {
      return (dateValue as any).toDate()
    }
    
    if (typeof dateValue === 'string') return new Date(dateValue)
    
    return new Date()
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) return <ImageIcon className="h-4 w-4" />
    if (fileType.startsWith("video/")) return <Video className="h-4 w-4" />
    return <File className="h-4 w-4" />
  }

  const formatTime = (dateValue: Date | Timestamp | string | any) => {
    const d = toDate(dateValue)
    const now = new Date()
    const diffInHours = (now.getTime() - d.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return d.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    } else if (diffInHours < 168) {
      return d.toLocaleDateString("en-US", { weekday: "short" })
    } else {
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    }
  }

  const formatFullDateTime = (dateValue: Date | Timestamp | string | any) => {
    const d = toDate(dateValue)
    return d.toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  }

  const handleDownload = async (file: { name: string; url: string; type: string }) => {
    try {
      window.open(file.url, '_blank')
    } catch (error) {
      console.error('Error downloading file:', error)
    }
  }

  // Get group name helper
  const getGroupName = (groupId: string) => {
    return allGroups.get(groupId)?.name || `Group ${groupId.substring(0, 6)}`
  }

  // Get user name helper
  const getUserName = (userId: string) => {
    return userNames.get(userId) || 'Unknown User'
  }

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["student", "group_admin", "admin", "super_admin"]}>
        <MainLayout>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </MainLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute allowedRoles={["student", "group_admin", "admin", "super_admin"]}>
      <MainLayout>
        <div className="space-y-6">
          {/* Welcome Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-6">
            <h1 className="text-3xl font-bold mb-2">Welcome to LinuxWorld, {user?.name}!</h1>
            <p className="text-blue-100">Stay updated with the latest announcements and course materials.</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">My Groups</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userGroups.length}</div>
                <p className="text-xs text-muted-foreground">Active enrollments</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Announcements</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{announcements.length}</div>
                <p className="text-xs text-muted-foreground">Total messages</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Course Materials</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {announcements.reduce((total, announcement) => total + (announcement.files?.length || 0), 0)}
                </div>
                <p className="text-xs text-muted-foreground">Available files</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Last Activity</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {announcements.length > 0 ? formatTime(announcements[0].createdAt) : "N/A"}
                </div>
                <p className="text-xs text-muted-foreground">Latest announcement</p>
              </CardContent>
            </Card>
          </div>

          {/* Announcements Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Recent Announcements</h2>
                            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search announcements..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>

            {filteredAnnouncements.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  {searchQuery ? (
                    <>
                      <Search className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">No matching announcements found</h3>
                      <p className="text-muted-foreground text-center">
                        No announcements match "{searchQuery}". Try a different search term.
                      </p>
                    </>
                  ) : (
                    <>
                      <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">No announcements yet</h3>
                      <p className="text-muted-foreground text-center">
                        {userGroups.length === 0
                          ? "You're not enrolled in any groups yet. Contact your administrator to get assigned to groups."
                          : "Your instructors haven't posted any announcements yet. Check back later for updates."}
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredAnnouncements.map((announcement) => (
                  <Card key={announcement.id} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary">
                              {getGroupName(announcement.groupId)}
                            </Badge>
                            <span className="text-sm text-muted-foreground">•</span>
                            <span
                              className="text-sm text-muted-foreground"
                              title={formatFullDateTime(announcement.createdAt)}
                            >
                              {formatTime(announcement.createdAt)}
                            </span>
                          </div>
                          <CardTitle className="text-lg">{announcement.title}</CardTitle>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{announcement.content}</p>

                      {/* File Attachments */}
                      {announcement.files && announcement.files.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium text-muted-foreground">Attachments</h4>
                          <div className="grid gap-2">
                            {announcement.files.map((file, index) => (
                              <div
                                key={file.id || index}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors"
                              >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <div className="flex-shrink-0">
                                    {getFileIcon(file.type)}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium truncate">{file.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {file.size ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'Size unknown'}
                                    </p>
                                  </div>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleDownload(file)}
                                  className="flex-shrink-0 ml-2"
                                  title={`Download ${file.name}`}
                                >
                                  <Download className="h-4 w-4" />
                                  <span className="sr-only">Download</span>
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Metadata */}
                      {user?.role !== 'student' && (
                        <div className="pt-3 border-t">
                          <p className="text-xs text-muted-foreground">
                            Posted by {getUserName(announcement.createdBy)} • 
                            {announcement.viewedBy ? ` Viewed by ${announcement.viewedBy.length} students` : ' No views yet'}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}
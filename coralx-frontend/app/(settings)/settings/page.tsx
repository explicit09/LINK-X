"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Bell, Shield, Globe, Moon, Sun, UserCircle } from 'lucide-react';
import Link from "next/link";

const Settings = () => {
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [privacy, setPrivacy] = useState(true);

  return (
    <div className="flex flex-col bg-black text-white min-h-screen w-full pt-24 pb-12 px-4 md:px-6">
      <div className="max-w-[900px] mx-auto w-full">
        <div className="mb-8 flex items-center">
          <Link href="/" className="flex items-center text-gray-300 hover:text-blue-400 mr-4">
            <ArrowLeft size={20} className="mr-2" />
            Back to Home
          </Link>
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>
        
        <Tabs defaultValue="account" className="w-full">
          <TabsList className="grid grid-cols-4 mb-8">
            <TabsTrigger value="account" className="flex items-center justify-center gap-2">
              <UserCircle size={18} /> Account
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center justify-center gap-2">
              <Moon size={18} /> Appearance
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center justify-center gap-2">
              <Bell size={18} /> Notifications
            </TabsTrigger>
            <TabsTrigger value="privacy" className="flex items-center justify-center gap-2">
              <Shield size={18} /> Privacy
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="account">
            <Card>
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>Manage your account information and preferences.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="email">Email</Label>
                  <input
                    id="email"
                    placeholder="Enter your email"
                    defaultValue="user@example.com"
                    className="w-full bg-muted rounded-md p-2 text-foreground"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="name">Display Name</Label>
                  <input
                    id="name"
                    placeholder="Enter your name"
                    defaultValue="John Doe"
                    className="w-full bg-muted rounded-md p-2 text-foreground"
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button>Save Changes</Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="appearance">
            <Card>
              <CardHeader>
                <CardTitle>Appearance Settings</CardTitle>
                <CardDescription>Customize how the application looks.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center space-x-2">
                    <Moon size={20} />
                    <span>Dark Mode</span>
                  </div>
                  <Switch checked={darkMode} onCheckedChange={setDarkMode} />
                </div>
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center space-x-2">
                    <Globe size={20} />
                    <span>Language</span>
                  </div>
                  <select className="bg-muted rounded-md p-2">
                    <option>English</option>
                    <option>Spanish</option>
                    <option>French</option>
                    <option>German</option>
                  </select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>Manage your notification preferences.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium">Push Notifications</p>
                    <p className="text-sm text-muted-foreground">Receive notifications on your device.</p>
                  </div>
                  <Switch checked={notifications} onCheckedChange={setNotifications} />
                </div>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium">Email Alerts</p>
                    <p className="text-sm text-muted-foreground">Receive updates via email.</p>
                  </div>
                  <Switch checked={emailAlerts} onCheckedChange={setEmailAlerts} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="privacy">
            <Card>
              <CardHeader>
                <CardTitle>Privacy Settings</CardTitle>
                <CardDescription>Manage your privacy preferences.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium">Profile Visibility</p>
                    <p className="text-sm text-muted-foreground">Control who can see your profile information.</p>
                  </div>
                  <Switch checked={privacy} onCheckedChange={setPrivacy} />
                </div>
                <div className="space-y-1">
                  <Label>Data Usage</Label>
                  <p className="text-sm text-muted-foreground">We collect anonymized data to improve your experience.</p>
                  <Button variant="outline" size="sm" className="mt-2">
                    Manage Data Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Settings;

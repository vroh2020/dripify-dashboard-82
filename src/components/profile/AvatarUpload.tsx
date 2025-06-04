import React, { useState } from "react";
import { Camera, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { validateFileUpload, checkRateLimit, sanitizeTextInput } from "@/utils/security";

interface AvatarUploadProps {
  avatarUrl: string | null;
  userId: string;
  username: string;
  onAvatarUpdate: (url: string) => void;
}

export const AvatarUpload = ({ avatarUrl, userId, username, onAvatarUpdate }: AvatarUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(avatarUrl);
  const { toast } = useToast();

  const uploadAvatar = async (file: File) => {
    try {
      setUploading(true);

      if (!userId) {
        throw new Error("User ID is required");
      }

      // Security: Rate limiting check
      const rateLimitResult = checkRateLimit(`avatar_upload_${userId}`, {
        maxRequests: 5,
        windowMs: 5 * 60 * 1000, // 5 minutes
        blockDurationMs: 15 * 60 * 1000 // 15 minutes block
      });

      if (!rateLimitResult.allowed) {
        throw new Error(`Too many upload attempts. Please try again in ${rateLimitResult.retryAfter} seconds.`);
      }

      // Security: Comprehensive file validation
      const validation = validateFileUpload(file);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Additional security: Check for malicious file content patterns
      const fileContent = await file.arrayBuffer();
      const uint8Array = new Uint8Array(fileContent);
      
      // Check for common script injection patterns in file headers
      const fileHeader = Array.from(uint8Array.slice(0, 1024))
        .map(byte => String.fromCharCode(byte))
        .join('');
      
      const maliciousPatterns = [
        /<script/i,
        /javascript:/i,
        /data:text\/html/i,
        /<iframe/i,
        /<object/i,
        /<embed/i
      ];
      
      for (const pattern of maliciousPatterns) {
        if (pattern.test(fileHeader)) {
          throw new Error('File contains suspicious content and cannot be uploaded');
        }
      }

      // Generate a secure file name using the user ID and timestamp
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const sanitizedUserId = sanitizeTextInput(userId);
      const timestamp = Date.now();
      const fileName = `${sanitizedUserId}/${timestamp}.${fileExt}`;

      // Upload the file to Supabase storage with security headers
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          upsert: true,
          cacheControl: '3600',
          contentType: file.type
        });

      if (error) {
        console.error('Storage upload error:', error);
        throw error;
      }

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Security: Validate the returned URL
      if (!publicUrl || !publicUrl.startsWith('https://')) {
        throw new Error('Invalid upload response');
      }

      // Update the user's avatar_url in the profiles table
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          avatar_url: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Profile update error:', updateError);
        throw updateError;
      }

      // Call the onAvatarUpdate callback
      onAvatarUpdate(publicUrl);
      
      toast({
        title: "Avatar updated",
        description: "Your profile picture has been updated successfully.",
      });

      return publicUrl;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "There was an error uploading your avatar.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Security: Immediate file validation before processing
      const validation = validateFileUpload(file);
      if (!validation.isValid) {
        toast({
          title: "Invalid file",
          description: validation.errors.join(', '),
          variant: "destructive",
        });
        return;
      }

      // Create preview
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);

      // Upload the file
      await uploadAvatar(file);

      // Clean up object URL
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      // Error is already handled in uploadAvatar
      console.error('File selection error:', error);
    }

    // Clear the input to allow re-selection of the same file
    event.target.value = '';
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative group">
        <div className="w-20 h-20 rounded-full overflow-hidden bg-white/10 border-2 border-white/20">
          {preview ? (
            <img
              src={preview}
              alt={`${username}'s avatar`}
              className="w-full h-full object-cover"
              onError={() => setPreview(null)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Camera className="w-8 h-8 text-white/50" />
            </div>
          )}
        </div>
        
        {/* Upload overlay */}
        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
          <Upload className="w-6 h-6 text-white" />
        </div>
        
        {/* Hidden file input */}
        <input
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleFileSelect}
          disabled={uploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          aria-label="Upload avatar image"
        />
      </div>
      
      <div className="text-center">
        <h3 className="text-lg font-medium text-white">{username}</h3>
        <p className="text-sm text-white/60 mt-1">
          {uploading ? 'Uploading...' : 'Click to change avatar'}
        </p>
        <p className="text-xs text-white/40 mt-1">
          JPG, PNG, WebP • Max 10MB
        </p>
      </div>
    </div>
  );
};

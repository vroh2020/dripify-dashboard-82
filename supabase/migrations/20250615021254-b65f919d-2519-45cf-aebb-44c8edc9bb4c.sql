
-- First, let's create the storage policies (skip bucket creation since it exists)
-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can upload their own style images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own style images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view style images" ON storage.objects;

-- Create storage policies for style images
CREATE POLICY "Users can upload their own style images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'style_images' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can view their own style images"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'style_images'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Public can view style images"
ON storage.objects FOR SELECT
USING (bucket_id = 'style_images');

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view their own analyses" ON style_analyses;
DROP POLICY IF EXISTS "Users can insert their own analyses" ON style_analyses;
DROP POLICY IF EXISTS "Users can view their own outfits" ON saved_outfits;
DROP POLICY IF EXISTS "Users can insert their own outfits" ON saved_outfits;
DROP POLICY IF EXISTS "Users can view their own achievements" ON user_achievements;
DROP POLICY IF EXISTS "Users can insert their own achievements" ON user_achievements;

-- Create user-scoped policies for profiles
CREATE POLICY "Users can view their own profile" ON profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles  
FOR UPDATE USING (auth.uid() = id);

-- Create user-scoped policies for style_analyses
CREATE POLICY "Users can view their own analyses" ON style_analyses
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analyses" ON style_analyses
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create user-scoped policies for saved_outfits
CREATE POLICY "Users can view their own outfits" ON saved_outfits
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own outfits" ON saved_outfits
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create user-scoped policies for user_achievements  
CREATE POLICY "Users can view their own achievements" ON user_achievements
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own achievements" ON user_achievements
FOR INSERT WITH CHECK (auth.uid() = user_id);

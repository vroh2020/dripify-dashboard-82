-- Create tables for social features
-- Run this in your Supabase SQL editor

-- Fits table - user uploaded outfits
CREATE TABLE IF NOT EXISTS fits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Hearts table - likes on fits
CREATE TABLE IF NOT EXISTS hearts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  fit_id UUID REFERENCES fits(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, fit_id) -- Prevent duplicate hearts
);

-- Saves table - saved outfit ideas
CREATE TABLE IF NOT EXISTS saves (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  outfit_idea_id TEXT NOT NULL, -- reference to curated outfit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, outfit_idea_id) -- Prevent duplicate saves
);

-- RLS Policies
ALTER TABLE fits ENABLE ROW LEVEL SECURITY;
ALTER TABLE hearts ENABLE ROW LEVEL SECURITY;
ALTER TABLE saves ENABLE ROW LEVEL SECURITY;

-- Fits policies - anyone can read, users can insert/update their own
CREATE POLICY "Fits are viewable by everyone" ON fits FOR SELECT USING (true);
CREATE POLICY "Users can insert their own fits" ON fits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own fits" ON fits FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own fits" ON fits FOR DELETE USING (auth.uid() = user_id);

-- Hearts policies - anyone can read, users can manage their own hearts
CREATE POLICY "Hearts are viewable by everyone" ON hearts FOR SELECT USING (true);
CREATE POLICY "Users can insert their own hearts" ON hearts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own hearts" ON hearts FOR DELETE USING (auth.uid() = user_id);

-- Saves policies - users can only see their own saves
CREATE POLICY "Users can view their own saves" ON saves FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own saves" ON saves FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own saves" ON saves FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS fits_created_at_idx ON fits(created_at DESC);
CREATE INDEX IF NOT EXISTS fits_user_id_idx ON fits(user_id);
CREATE INDEX IF NOT EXISTS hearts_fit_id_idx ON hearts(fit_id);
CREATE INDEX IF NOT EXISTS hearts_user_id_idx ON hearts(user_id);
CREATE INDEX IF NOT EXISTS saves_user_id_idx ON saves(user_id);

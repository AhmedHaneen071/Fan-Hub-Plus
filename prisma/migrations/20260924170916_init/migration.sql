-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "avatar_url" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" DATETIME NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasswordResetToken_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "cover_image" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "Content" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "release_date" DATETIME,
    "popularity_score" INTEGER NOT NULL DEFAULT 0,
    "media_url" TEXT,
    CONSTRAINT "Content_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CharacterProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "image_url" TEXT,
    CONSTRAINT "CharacterProfile_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FeaturedArticle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "rich_text_body" TEXT NOT NULL,
    "cover_image" TEXT,
    "event_timeline" TEXT NOT NULL DEFAULT '[]',
    CONSTRAINT "FeaturedArticle_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MerchandiseItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "image_url" TEXT,
    "tag" TEXT NOT NULL,
    "is_upcoming" BOOLEAN NOT NULL DEFAULT false,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "price" DECIMAL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MerchandiseItem_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Bookmark" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "content_id" TEXT,
    "character_id" TEXT,
    "merchandise_id" TEXT,
    "note" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Bookmark_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Bookmark_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "Content" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Bookmark_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "CharacterProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Bookmark_merchandise_id_fkey" FOREIGN KEY ("merchandise_id") REFERENCES "MerchandiseItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Rating" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "content_id" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "ratingType" TEXT NOT NULL DEFAULT 'STARS',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Rating_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Rating_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "Content" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FanSubmission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "category_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" DATETIME,
    CONSTRAINT "FanSubmission_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FanSubmission_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChatbotQuery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT,
    "message" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "category_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatbotQuery_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ChatbotQuery_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChatbotFAQ" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "category_id" TEXT,
    "keywords" TEXT NOT NULL DEFAULT '',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatbotFAQ_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "ticket_link" TEXT,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "category_id" TEXT,
    CONSTRAINT "Event_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_CategoryToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_CategoryToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_CategoryToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "PasswordResetToken_user_id_idx" ON "PasswordResetToken"("user_id");

-- CreateIndex
CREATE INDEX "PasswordResetToken_token_hash_idx" ON "PasswordResetToken"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE INDEX "Category_name_idx" ON "Category"("name");

-- CreateIndex
CREATE INDEX "Content_category_id_idx" ON "Content"("category_id");

-- CreateIndex
CREATE INDEX "Content_type_idx" ON "Content"("type");

-- CreateIndex
CREATE INDEX "Content_popularity_score_idx" ON "Content"("popularity_score");

-- CreateIndex
CREATE INDEX "CharacterProfile_category_id_idx" ON "CharacterProfile"("category_id");

-- CreateIndex
CREATE INDEX "CharacterProfile_name_idx" ON "CharacterProfile"("name");

-- CreateIndex
CREATE INDEX "FeaturedArticle_category_id_idx" ON "FeaturedArticle"("category_id");

-- CreateIndex
CREATE INDEX "MerchandiseItem_category_id_idx" ON "MerchandiseItem"("category_id");

-- CreateIndex
CREATE INDEX "MerchandiseItem_tag_idx" ON "MerchandiseItem"("tag");

-- CreateIndex
CREATE INDEX "MerchandiseItem_is_upcoming_idx" ON "MerchandiseItem"("is_upcoming");

-- CreateIndex
CREATE INDEX "Bookmark_user_id_idx" ON "Bookmark"("user_id");

-- CreateIndex
CREATE INDEX "Bookmark_content_id_idx" ON "Bookmark"("content_id");

-- CreateIndex
CREATE INDEX "Bookmark_character_id_idx" ON "Bookmark"("character_id");

-- CreateIndex
CREATE INDEX "Bookmark_merchandise_id_idx" ON "Bookmark"("merchandise_id");

-- CreateIndex
CREATE INDEX "Rating_content_id_idx" ON "Rating"("content_id");

-- CreateIndex
CREATE UNIQUE INDEX "Rating_user_id_content_id_key" ON "Rating"("user_id", "content_id");

-- CreateIndex
CREATE INDEX "Feedback_user_id_idx" ON "Feedback"("user_id");

-- CreateIndex
CREATE INDEX "Feedback_type_idx" ON "Feedback"("type");

-- CreateIndex
CREATE INDEX "FanSubmission_user_id_idx" ON "FanSubmission"("user_id");

-- CreateIndex
CREATE INDEX "FanSubmission_status_idx" ON "FanSubmission"("status");

-- CreateIndex
CREATE INDEX "ChatbotQuery_user_id_idx" ON "ChatbotQuery"("user_id");

-- CreateIndex
CREATE INDEX "ChatbotFAQ_category_id_idx" ON "ChatbotFAQ"("category_id");

-- CreateIndex
CREATE INDEX "Event_city_idx" ON "Event"("city");

-- CreateIndex
CREATE INDEX "Event_date_idx" ON "Event"("date");

-- CreateIndex
CREATE UNIQUE INDEX "_CategoryToUser_AB_unique" ON "_CategoryToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_CategoryToUser_B_index" ON "_CategoryToUser"("B");

CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"entity_id" text NOT NULL,
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "banners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"truck" text NOT NULL,
	"title" text NOT NULL,
	"title_ar" text DEFAULT '' NOT NULL,
	"text" text DEFAULT '' NOT NULL,
	"text_ar" text DEFAULT '' NOT NULL,
	"image" text DEFAULT '' NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"truck" text NOT NULL,
	"name" text NOT NULL,
	"name_ar" text NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coupons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"truck" text NOT NULL,
	"code" text NOT NULL,
	"percent" integer NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"purpose" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid,
	"name" text NOT NULL,
	"quantity" integer NOT NULL,
	"price" integer NOT NULL,
	"removed_ingredients" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" serial NOT NULL,
	"truck" text NOT NULL,
	"user_id" uuid,
	"subscription_id" uuid,
	"customer_name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"region_id" uuid,
	"address" text DEFAULT '' NOT NULL,
	"fulfillment" text NOT NULL,
	"type" text DEFAULT 'direct' NOT NULL,
	"status" text DEFAULT 'NOT_READY' NOT NULL,
	"subtotal" integer NOT NULL,
	"delivery_fee" integer DEFAULT 0 NOT NULL,
	"discount" integer DEFAULT 0 NOT NULL,
	"total" integer NOT NULL,
	"coupon" text,
	"notes" text DEFAULT '' NOT NULL,
	"tracking_hash" text NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"truck" text NOT NULL,
	"category_id" uuid,
	"name" text NOT NULL,
	"name_ar" text NOT NULL,
	"description" text NOT NULL,
	"description_ar" text NOT NULL,
	"price" integer NOT NULL,
	"image" text NOT NULL,
	"ingredients" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"badge" text DEFAULT '' NOT NULL,
	"available" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	"reset_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "regions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"truck" text NOT NULL,
	"name" text NOT NULL,
	"name_ar" text NOT NULL,
	"fee" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"id" text PRIMARY KEY DEFAULT 'site' NOT NULL,
	"brand_name" text DEFAULT 'Street Taste Truck' NOT NULL,
	"logo_url" text DEFAULT '' NOT NULL,
	"welcome" text DEFAULT 'WELCOME TO STREET TASTE TRUCK' NOT NULL,
	"welcome_ar" text DEFAULT 'مرحباً بكم في عربة ستريت تيست' NOT NULL,
	"hero_first" text DEFAULT 'Two trucks.' NOT NULL,
	"hero_first_ar" text DEFAULT 'عربتان.' NOT NULL,
	"hero_second" text DEFAULT 'Endless cravings.' NOT NULL,
	"hero_second_ar" text DEFAULT 'نكهات بلا حدود.' NOT NULL,
	"intro" text DEFAULT 'Your daily pick-me-up or your next favorite bite. Freshly made, full of flavor, and always worth the stop.' NOT NULL,
	"intro_ar" text DEFAULT 'مشروبك المفضل أو لقمتك القادمة. طازجة وغنية بالنكهة، وتستحق كل وقفة.' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"truck" text NOT NULL,
	"user_id" uuid,
	"customer_name" text NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"time" text NOT NULL,
	"selections" jsonb NOT NULL,
	"total" integer NOT NULL,
	"discount" integer NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trucks" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"name_ar" text NOT NULL,
	"title" text NOT NULL,
	"title_ar" text NOT NULL,
	"description" text NOT NULL,
	"description_ar" text NOT NULL,
	"logo_url" text DEFAULT '' NOT NULL,
	"discount" integer DEFAULT 10 NOT NULL,
	"hours" jsonb DEFAULT '[{"open":"08:00","close":"14:00"},{"open":"17:00","close":"23:00"}]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text,
	"email" text,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"region_id" uuid,
	"address" text DEFAULT '' NOT NULL,
	"role" text DEFAULT 'customer' NOT NULL,
	"truck" text,
	"permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "banners" ADD CONSTRAINT "banners_truck_trucks_id_fk" FOREIGN KEY ("truck") REFERENCES "public"."trucks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_truck_trucks_id_fk" FOREIGN KEY ("truck") REFERENCES "public"."trucks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_truck_trucks_id_fk" FOREIGN KEY ("truck") REFERENCES "public"."trucks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_tokens" ADD CONSTRAINT "email_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_truck_trucks_id_fk" FOREIGN KEY ("truck") REFERENCES "public"."trucks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_truck_trucks_id_fk" FOREIGN KEY ("truck") REFERENCES "public"."trucks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "regions" ADD CONSTRAINT "regions_truck_trucks_id_fk" FOREIGN KEY ("truck") REFERENCES "public"."trucks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_truck_trucks_id_fk" FOREIGN KEY ("truck") REFERENCES "public"."trucks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_truck_trucks_id_fk" FOREIGN KEY ("truck") REFERENCES "public"."trucks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "category_truck_name" ON "categories" USING btree ("truck","name");--> statement-breakpoint
CREATE UNIQUE INDEX "coupon_truck_code" ON "coupons" USING btree ("truck","code");--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_truck_status_idx" ON "orders" USING btree ("truck","status");--> statement-breakpoint
CREATE INDEX "order_schedule_idx" ON "orders" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "order_user_idx" ON "orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "product_truck_idx" ON "products" USING btree ("truck");--> statement-breakpoint
CREATE UNIQUE INDEX "product_truck_name" ON "products" USING btree ("truck","name");--> statement-breakpoint
CREATE UNIQUE INDEX "region_truck_name" ON "regions" USING btree ("truck","name");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");
CREATE SCHEMA "world_medicine";
--> statement-breakpoint
CREATE TABLE "world_medicine"."audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" integer,
	"old_value" jsonb,
	"new_value" jsonb,
	"ip_address" varchar(45),
	"user_agent" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "world_medicine"."budget_scenarios" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"current_budget" numeric(20, 2) NOT NULL,
	"growth_percent" numeric(5, 2) NOT NULL,
	"target_budget" numeric(20, 2) NOT NULL,
	"drugs" jsonb NOT NULL,
	"district_shares" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "world_medicine"."contragents" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(500) NOT NULL,
	"group_name" varchar(255),
	"city" varchar(255),
	"region" varchar(255),
	"settlement" varchar(255),
	"district" varchar(255),
	"territory_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "world_medicine"."conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "world_medicine"."drug_prices" (
	"id" serial PRIMARY KEY NOT NULL,
	"drug_id" integer NOT NULL,
	"price" numeric(15, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'RUB' NOT NULL,
	"price_type" varchar(50) DEFAULT 'retail' NOT NULL,
	"valid_from" timestamp NOT NULL,
	"valid_to" timestamp,
	"source_type" varchar(50),
	"source_document" varchar(255),
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "world_medicine"."drug_to_wm_product" (
	"id" serial PRIMARY KEY NOT NULL,
	"drug_id" integer NOT NULL,
	"wm_product_id" integer NOT NULL,
	"mapping_type" varchar(50) DEFAULT 'exact' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "world_medicine"."drugs" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(500) NOT NULL,
	"short_name" varchar(255),
	"dosage" varchar(100),
	"form" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "drugs_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "world_medicine"."messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "world_medicine"."notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"link" varchar(500),
	"is_read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "world_medicine"."password_reset_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token_hash" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "world_medicine"."sales" (
	"id" serial PRIMARY KEY NOT NULL,
	"drug_id" integer NOT NULL,
	"territory_id" integer NOT NULL,
	"contragent_id" integer,
	"period" varchar(20) NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"quantity" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "world_medicine"."saved_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"year" integer NOT NULL,
	"territory_id" integer,
	"drug_id" integer,
	"plan_value" numeric(15, 2) NOT NULL,
	"is_locked" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "world_medicine"."saved_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(100) NOT NULL,
	"filters" jsonb NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "world_medicine"."territories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"parent_id" integer,
	"level" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "world_medicine"."upload_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"filename" varchar(500) NOT NULL,
	"status" varchar(50) NOT NULL,
	"rows_count" integer,
	"error_message" text,
	"uploaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "world_medicine"."user_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token_hash" varchar(255) NOT NULL,
	"device_name" varchar(255),
	"device_type" varchar(50),
	"browser" varchar(100),
	"ip_address" varchar(45),
	"user_agent" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_activity_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "world_medicine"."user_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"theme" varchar(20) DEFAULT 'light' NOT NULL,
	"language" varchar(10) DEFAULT 'ru' NOT NULL,
	"email_notifications" boolean DEFAULT true NOT NULL,
	"push_notifications" boolean DEFAULT true NOT NULL,
	"default_view" varchar(50) DEFAULT 'dashboard',
	"date_format" varchar(20) DEFAULT 'DD.MM.YYYY',
	"timezone" varchar(50) DEFAULT 'Europe/Moscow',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "world_medicine"."users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"role" varchar(50) DEFAULT 'analyst' NOT NULL,
	"avatar" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_login" timestamp,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "world_medicine"."wm_products" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(500) NOT NULL,
	"short_name" varchar(100),
	"category" varchar(100),
	"dosage" varchar(100),
	"form" varchar(100),
	"pack_size" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "wm_products_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "world_medicine"."yearly_sales_data" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"year" integer NOT NULL,
	"data_type" varchar(50) NOT NULL,
	"aggregated_data" jsonb NOT NULL,
	"is_locked" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "world_medicine"."audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "world_medicine"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_medicine"."budget_scenarios" ADD CONSTRAINT "budget_scenarios_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "world_medicine"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_medicine"."contragents" ADD CONSTRAINT "contragents_territory_id_territories_id_fk" FOREIGN KEY ("territory_id") REFERENCES "world_medicine"."territories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_medicine"."drug_prices" ADD CONSTRAINT "drug_prices_drug_id_drugs_id_fk" FOREIGN KEY ("drug_id") REFERENCES "world_medicine"."drugs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_medicine"."drug_prices" ADD CONSTRAINT "drug_prices_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "world_medicine"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_medicine"."drug_to_wm_product" ADD CONSTRAINT "drug_to_wm_product_drug_id_drugs_id_fk" FOREIGN KEY ("drug_id") REFERENCES "world_medicine"."drugs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_medicine"."drug_to_wm_product" ADD CONSTRAINT "drug_to_wm_product_wm_product_id_wm_products_id_fk" FOREIGN KEY ("wm_product_id") REFERENCES "world_medicine"."wm_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_medicine"."messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "world_medicine"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_medicine"."notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "world_medicine"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_medicine"."password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "world_medicine"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_medicine"."sales" ADD CONSTRAINT "sales_drug_id_drugs_id_fk" FOREIGN KEY ("drug_id") REFERENCES "world_medicine"."drugs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_medicine"."sales" ADD CONSTRAINT "sales_territory_id_territories_id_fk" FOREIGN KEY ("territory_id") REFERENCES "world_medicine"."territories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_medicine"."sales" ADD CONSTRAINT "sales_contragent_id_contragents_id_fk" FOREIGN KEY ("contragent_id") REFERENCES "world_medicine"."contragents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_medicine"."saved_plans" ADD CONSTRAINT "saved_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "world_medicine"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_medicine"."saved_plans" ADD CONSTRAINT "saved_plans_territory_id_territories_id_fk" FOREIGN KEY ("territory_id") REFERENCES "world_medicine"."territories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_medicine"."saved_plans" ADD CONSTRAINT "saved_plans_drug_id_drugs_id_fk" FOREIGN KEY ("drug_id") REFERENCES "world_medicine"."drugs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_medicine"."saved_reports" ADD CONSTRAINT "saved_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "world_medicine"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_medicine"."upload_history" ADD CONSTRAINT "upload_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "world_medicine"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_medicine"."user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "world_medicine"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_medicine"."user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "world_medicine"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_medicine"."yearly_sales_data" ADD CONSTRAINT "yearly_sales_data_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "world_medicine"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_drug_wm_product" ON "world_medicine"."drug_to_wm_product" USING btree ("drug_id","wm_product_id");
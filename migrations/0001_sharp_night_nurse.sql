CREATE TABLE "world_medicine"."column_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"profile_name" varchar(255) NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"mappings" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "world_medicine"."sales_rep_territories" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"regions" jsonb NOT NULL,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "world_medicine"."column_mappings" ADD CONSTRAINT "column_mappings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "world_medicine"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_medicine"."sales_rep_territories" ADD CONSTRAINT "sales_rep_territories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "world_medicine"."users"("id") ON DELETE cascade ON UPDATE no action;
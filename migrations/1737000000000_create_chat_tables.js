exports.up = (pgm) => {
    // Create chat_sessions table
    pgm.createTable("chat_sessions", {
        id: {
            type: "uuid",
            default: pgm.func("gen_random_uuid()"),
            notNull: true,
            primaryKey: true,
        },
        user_id: { type: "varchar(128)", notNull: true }, // Firebase UID
        title: { type: "text", notNull: true },
        is_active: { type: "boolean", default: false },
        created_at: {
            type: "timestamp",
            notNull: true,
            default: pgm.func("current_timestamp"),
        },
        updated_at: {
            type: "timestamp",
            notNull: true,
            default: pgm.func("current_timestamp"),
        },
    });

    // Create chat_messages table
    pgm.createTable("chat_messages", {
        id: {
            type: "uuid",
            default: pgm.func("gen_random_uuid()"),
            notNull: true,
            primaryKey: true,
        },
        session_id: {
            type: "uuid",
            notNull: true,
            references: '"chat_sessions"',
            onDelete: "CASCADE",
        },
        text: { type: "text", notNull: true },
        is_user: { type: "boolean", notNull: true },
        confirmation: { type: "jsonb" }, // For confirmation requests
        tasks: { type: "jsonb" }, // For task data in responses
        created_at: {
            type: "timestamp",
            notNull: true,
            default: pgm.func("current_timestamp"),
        },
    });

    // Create recent_chats table for tracking recent queries
    pgm.createTable("recent_chats", {
        id: {
            type: "uuid",
            default: pgm.func("gen_random_uuid()"),
            notNull: true,
            primaryKey: true,
        },
        user_id: { type: "varchar(128)", notNull: true }, // Firebase UID
        query: { type: "text", notNull: true },
        created_at: {
            type: "timestamp",
            notNull: true,
            default: pgm.func("current_timestamp"),
        },
    });

    // Create indexes for performance
    pgm.createIndex("chat_sessions", "user_id");
    pgm.createIndex("chat_sessions", ["user_id", "is_active"]);
    pgm.createIndex("chat_sessions", ["user_id", "updated_at"]);
    pgm.createIndex("chat_messages", "session_id");
    pgm.createIndex("chat_messages", ["session_id", "created_at"]);
    pgm.createIndex("recent_chats", "user_id");
    pgm.createIndex("recent_chats", ["user_id", "created_at"]);

    // Create unique constraint to ensure only one active session per user
    pgm.createIndex("chat_sessions", ["user_id"], {
        name: "idx_chat_sessions_user_active",
        where: "is_active = true",
        unique: true,
    });

    // Create unique constraint for recent chats to avoid duplicates
    pgm.createIndex("recent_chats", ["user_id", "query"], {
        name: "idx_recent_chats_user_query",
        unique: true,
    });
};

exports.down = (pgm) => {
    pgm.dropTable("recent_chats");
    pgm.dropTable("chat_messages");
    pgm.dropTable("chat_sessions");
};
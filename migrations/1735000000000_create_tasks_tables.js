exports.up = (pgm) => {
    // Create tasks table
    pgm.createTable("tasks", {
        id: {
            type: "uuid",
            default: pgm.func("gen_random_uuid()"),
            notNull: true,
            primaryKey: true,
        },
        user_id: { type: "varchar(128)", notNull: true }, // Firebase UID
        title: { type: "text", notNull: true },
        description: { type: "text" },
        start_time: { type: "text", notNull: true },
        end_time: { type: "text", notNull: true },
        date: { type: "text", notNull: true },
        tags: { type: "jsonb", default: "[]" },
        recurrence: { type: "jsonb", default: "{}" },
        is_completed: { type: "boolean", default: false },
        is_deleted: { type: "boolean", default: false },
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

    // Create subtasks table
    pgm.createTable("subtasks", {
        id: {
            type: "uuid",
            default: pgm.func("gen_random_uuid()"),
            notNull: true,
            primaryKey: true,
        },
        task_id: {
            type: "uuid",
            notNull: true,
            references: '"tasks"',
            onDelete: "CASCADE",
        },
        title: { type: "text", notNull: true },
        is_completed: { type: "boolean", default: false },
        order_index: { type: "integer", default: 0 },
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

    // Create indexes
    pgm.createIndex("tasks", "user_id");
    pgm.createIndex("tasks", ["user_id", "date"]);
    pgm.createIndex("subtasks", "task_id");
};

exports.down = (pgm) => {
    pgm.dropTable("subtasks");
    pgm.dropTable("tasks");
};

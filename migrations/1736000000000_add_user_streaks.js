exports.up = (pgm) => {
    pgm.addColumns("users", {
        current_streak: { type: "integer", notNull: true, default: 0 },
        longest_streak: { type: "integer", notNull: true, default: 0 },
        last_streak_date: { type: "text" },
    });

    pgm.createIndex("users", "last_streak_date");
};

exports.down = (pgm) => {
    pgm.dropIndex("users", "last_streak_date");
    pgm.dropColumns("users", ["current_streak", "longest_streak", "last_streak_date"]);
};
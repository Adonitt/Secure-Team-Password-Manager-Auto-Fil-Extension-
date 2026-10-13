package com.teamvault.enums;

public enum Role {
    VIEWER(1),
    EDITOR(2),
    ADMIN(3),
    OWNER(4);
    private final int level;

    Role(int level) {
        this.level = level;
    }

    public int level() {
        return level;
    }
}

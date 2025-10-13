package main

import (
	"fmt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	dsn := "host=localhost port=5433 user=postgres password=digitwin123 dbname=digitwin sslmode=disable"
	fmt.Printf("Testing connection: %s\n", dsn)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		fmt.Printf("❌ Failed: %v\n", err)
		return
	}

	sqlDB, _ := db.DB()
	if err := sqlDB.Ping(); err != nil {
		fmt.Printf("❌ Ping failed: %v\n", err)
		return
	}

	fmt.Printf("✅ Connection successful!\n")
	sqlDB.Close()
}

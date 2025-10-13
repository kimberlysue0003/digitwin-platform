package main

import (
	"fmt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	// Test different DSN formats
	dsns := []string{
		"host=localhost port=5432 user=postgres password=digitwin123 dbname=digitwin sslmode=disable",
		"host=127.0.0.1 port=5432 user=postgres password=digitwin123 dbname=digitwin sslmode=disable",
		"postgresql://postgres:digitwin123@localhost:5432/digitwin?sslmode=disable",
	}

	for i, dsn := range dsns {
		fmt.Printf("\n[Test %d] Trying DSN: %s\n", i+1, dsn)
		db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
		if err != nil {
			fmt.Printf("❌ Failed: %v\n", err)
			continue
		}

		sqlDB, _ := db.DB()
		if err := sqlDB.Ping(); err != nil {
			fmt.Printf("❌ Ping failed: %v\n", err)
			sqlDB.Close()
			continue
		}

		fmt.Printf("✅ Success!\n")
		sqlDB.Close()
		return
	}

	fmt.Println("\n❌ All connection attempts failed")
}

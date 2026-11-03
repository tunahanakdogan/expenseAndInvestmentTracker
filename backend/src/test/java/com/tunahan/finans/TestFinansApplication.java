package com.tunahan.finans;

import org.springframework.boot.SpringApplication;

public class TestFinansApplication {

	public static void main(String[] args) {
		SpringApplication.from(FinansApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}

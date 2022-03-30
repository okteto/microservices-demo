.PHONY: test
test:
	@if [ "${OKTETO_RUN_TEST}" = "true" ]; then\
		echo "Running tests...";\
		sleep 10;\
		echo "Test passing!";\
	else\
		echo "Tests skipped";\
	fi


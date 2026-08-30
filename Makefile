.PHONY: smoke coverage local target-600 preflight mobile-write
smoke:
	./scripts/run-final.sh smoke
coverage:
	./scripts/run-final.sh coverage
local:
	./scripts/run-final.sh local
target-600:
	./scripts/run-final.sh target-600
preflight:
	k6 run scripts/preflight.js
mobile-write:
	@echo 'Use: k6 run -e ENABLE_WRITES=true -e MOBILE_WRITE_TARGET=<target> scripts/mobile-write-validator.js'

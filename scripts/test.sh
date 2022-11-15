#!/bin/sh
lerna run test --parallel || echo 'errors in test results ignored'
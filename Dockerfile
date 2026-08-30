FROM grafana/k6:latest
WORKDIR /test
COPY . /test
ENTRYPOINT ["k6"]
CMD ["run", "scripts/performance.js"]

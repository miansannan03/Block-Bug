FROM php:8.2-cli

RUN docker-php-ext-install pdo_mysql

WORKDIR /app

COPY . /app

RUN chmod +x /app/render-start.sh \
    && mkdir -p /app/public/uploads/bugs

ENV PORT=10000

CMD ["/app/render-start.sh"]

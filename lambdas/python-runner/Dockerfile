FROM public.ecr.aws/lambda/nodejs:22

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY index.mjs ./

CMD ["index.handler"]

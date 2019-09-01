
locals {
  base_path = "${path.module}/src"
}

data "template_file" "this" {
  template = "${file("${local.base_path}/params.json")}"

  vars = {
    ERROR_CODE = "${var.error_code}"
    RESPONSE_CODE = "${var.response_code}"
    RESPONSE_PAGE_PATH = "${var.response_page_path}"
    PATH_PRESERVE_DEGREE = "${var.path_preserve_degree}"
  }
}

resource "local_file" "params" {
  content = "${data.template_file.this.rendered}"
  filename = "${local.base_path}/.archive/params.json"
}

data "local_file" "mainjs" {
  filename = "${local.base_path}/main.js"
}

resource "local_file" "mainjs" {
  content = "${data.local_file.mainjs.content}"
  filename = "${local.base_path}/.archive/main.js"
}

data "archive_file" "this" {
  depends_on = [
    "local_file.params",
    "local_file.mainjs"
  ]

  type = "zip"
  output_path = "${local.base_path}/.archive.zip"
  source_dir = "${local.base_path}/.archive"
}

resource "aws_lambda_function" "this" {
  description = "Lambda to route CloudFront origin request to api origin"
  role = "${aws_iam_role.this.arn}"
  runtime = "nodejs8.10"

  filename = "${data.archive_file.this.output_path}"
  source_code_hash = "${data.archive_file.this.output_base64sha256}"

  function_name = "${var.name}"
  handler = "main.handler"

  timeout = 10
  memory_size = 128
  publish = true
}


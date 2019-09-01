output "arn" {
  value = "${aws_lambda_function.this.arn}"
}

output "qualified_arn" {
  value = "${aws_lambda_function.this.qualified_arn}"
}

output "role_arn" {
  value = "${aws_iam_role.this.arn}"
}


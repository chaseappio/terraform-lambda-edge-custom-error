data "aws_iam_policy_document" "sts" {
  statement {
    effect = "Allow"

    actions = [
      "sts:AssumeRole",
    ]

    principals {
      type = "Service"

      identifiers = [
        "lambda.amazonaws.com",
        "edgelambda.amazonaws.com",
        "replicator.lambda.amazonaws.com",
      ]
    }
  }
}

data "aws_iam_policy_document" "this" {
  statement {
    effect = "Allow"

    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:DescribeLogGroups",
      "logs:DescribeLogStreams",
      "logs:PutLogEvents",
      "logs:GetLogEvents",
      "logs:FilterLogEvents"
    ]

    resources = [
      "arn:aws:logs:*:*:*"
    ]
  }

  statement {
    effect = "Allow"

    actions = [
      "iam:CreateServiceLinkedRole",
      "cloudfront:UpdateDistribution"
    ]

    resources = [
      "*"
    ]
  }

  statement {
    effect = "Allow"

    actions = [
      "lambda:GetFunction",
      "lambda:EnableReplication*",
    ]

    resources = [
      "${aws_lambda_function.this.arn}",
      "${aws_lambda_function.this.arn}:*",
    ]
  }
}

resource "aws_iam_role_policy" "this" {
  name   = "${var.name}-policy"
  role   = "${aws_iam_role.this.id}"
  policy = "${data.aws_iam_policy_document.this.json}"
}

resource "aws_iam_role" "this" {
  name               = "${var.name}-role"
  assume_role_policy = "${data.aws_iam_policy_document.sts.json}"
}

package main

import (
	"testing"
)

func init() {
	awsId = "AKIAIOSFODNN7EXAMPLE"
	awsKey = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
	*bucket = "johnsmith"
}

func TestSigning(t *testing.T) {
	exp := "http://johnsmith.s3.amazonaws.com/photos/puppy.jpg?Signature=NpgCjnDzrM%2BWFzoENXmpNDUsSn8%3D" +
		"&Expires=1175139620&AWSAccessKeyId=AKIAIOSFODNN7EXAMPLE"
	u := mkUrl("/photos/puppy.jpg", 1175139620)
	if u != exp {
		t.Errorf("Expected\n%v\ngot\n%v\n", exp, u)
	}
}

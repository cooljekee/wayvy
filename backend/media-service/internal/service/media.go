package service

import (
	"bytes"
	"context"
	"fmt"
	"image/jpeg"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/disintegration/imaging"
	"github.com/google/uuid"
)

type MediaService struct {
	s3     *s3.Client
	bucket string
	pubURL string // public base URL without trailing slash
}

func NewMediaService(endpoint, bucket, accessKeyID, secretAccessKey, pubURL string) (*MediaService, error) {
	cfg, err := awsconfig.LoadDefaultConfig(context.Background(),
		awsconfig.WithRegion("auto"),
		awsconfig.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
			accessKeyID, secretAccessKey, "",
		)),
	)
	if err != nil {
		return nil, fmt.Errorf("NewMediaService aws config: %w", err)
	}

	s3Client := s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.BaseEndpoint = aws.String(endpoint)
		o.UsePathStyle = true
	})

	return &MediaService{
		s3:     s3Client,
		bucket: bucket,
		pubURL: strings.TrimRight(pubURL, "/"),
	}, nil
}

const maxLongEdge = 1080

// Upload resizes data to max 1080px, encodes as JPEG q80, puts to R2.
// Returns (r2Key, publicURL, error).
func (s *MediaService) Upload(ctx context.Context, data []byte) (r2Key, publicURL string, err error) {
	src, err := imaging.Decode(bytes.NewReader(data))
	if err != nil {
		return "", "", fmt.Errorf("MediaService.Upload decode: %w", err)
	}

	// Resize only if either dimension exceeds the limit.
	bounds := src.Bounds()
	if bounds.Dx() > maxLongEdge || bounds.Dy() > maxLongEdge {
		src = imaging.Fit(src, maxLongEdge, maxLongEdge, imaging.Lanczos)
	}

	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, src, &jpeg.Options{Quality: 80}); err != nil {
		return "", "", fmt.Errorf("MediaService.Upload encode: %w", err)
	}

	key := "photos/" + uuid.New().String() + ".jpg"
	body := bytes.NewReader(buf.Bytes())

	_, err = s.s3.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(s.bucket),
		Key:         aws.String(key),
		Body:        body,
		ContentType: aws.String("image/jpeg"),
		ContentLength: aws.Int64(int64(buf.Len())),
	})
	if err != nil {
		return "", "", fmt.Errorf("MediaService.Upload PutObject: %w", err)
	}

	return key, s.pubURL + "/" + key, nil
}


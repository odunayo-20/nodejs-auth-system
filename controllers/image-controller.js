const express = require("express");
const { uploadToCloudinary } = require("../helpers/cloudinaryHelper");

const cloudinary = require("../config/cloudinary");

const fs = require("fs");
const Image = require("../models/Image");

const uploadImageController = async (req, res) => {
  try {
    // check if file is missing in req object
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "File is required. Please upload an image",
      });
    }

    // upload to cloudnary

    const { url, publicId } = await uploadToCloudinary(req.file.path);

    // store the image url and public id along with the upload user id

    const newlyUploadedImage = new Image({
      url,
      publicId,
      uploadedBy: req.userInfo.userId,
    });

    await newlyUploadedImage.save();

    // delete the file from local storage
    fs.unlinkSync(req.file.path);

    res.status(201).json({
      success: true,
      message: "Image upload successfully",
      image: newlyUploadedImage,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Something went wrong! Please try again",
    });
  }
};

// fetching all the images

const fetchImagesController = async (req, res) => {
  try {
    // pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    const sortBy = req.query.sortBy || "createdAt";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;
    const totalImages = await Image.countDocuments();
    const totalPages = Math.ceil(totalImages / limit);
    // const images = await Image.find({});

    const sortObj = {};
    sortObj[sortBy] = sortOrder;
    // const images = await Image.find({});
    const images = await Image.find().sort(sortObj).skip(skip).limit(limit);
    if (images) {
      res.status(200).json({
        success: true,
        currentPage: page,
        totalPages: totalPages,
        totalImages: totalImages,
        data: images,
      });
    } else {
      res.status(404).json({
        success: false,
        message: "Images not found",
      });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Something went wrong! Please try again",
    });
  }
};

// image delete controller
const deleteImageController = async (req, res) => {
  try {
    const getCurrentId = req.params.id;
    const userId = req.userInfo.userId;

    const image = await Image.findById(getCurrentId);

    if (!image) {
      return res.status(404).json({
        success: false,
        message: "Image not found",
      });
    }

    // check if this image is uploaded by the current user who is trying to delete

    if (image.uploadedBy.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized",
      });
    }

    // delete this image from your cloudinary storage

    if (image.publicId) {
      await cloudinary.uploader.destroy(image.publicId);
    }
    // delete this image from mongodb database

    await Image.findByIdAndDelete(getCurrentId);

    res.status(200).json({
      success: true,
      message: "Image successfully deleted",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Something went wrong! Please try again",
    });
  }
};

module.exports = {
  uploadImageController,
  fetchImagesController,
  deleteImageController,
};

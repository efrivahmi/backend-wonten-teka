<?php

namespace App\Http\Controllers;

abstract class Controller
{
    /**
     * Return a standardized success response.
     */
    public function sendResponse($result, $message = 'Data berhasil diambil.')
    {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data'    => $result,
        ]);
    }

    /**
     * Return a standardized error response.
     */
    public function sendError($error, $errorMessages = [], $code = 404)
    {
        $response = [
            'success' => false,
            'message' => $error,
        ];

        if (!empty($errorMessages)) {
            $response['errors'] = $errorMessages;
        }

        return response()->json($response, $code);
    }
}

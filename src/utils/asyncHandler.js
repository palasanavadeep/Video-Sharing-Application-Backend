
const asyncHandler = (fun) => {
    return (req,res,next) => {
        Promise.resolve(fun(req,res,next))
        .catch((err) => next(err))
    }
}

// const asyncHandler = (fun) => async (req,res,next) => {
//     try {
//         await fun(req,res,next)
//     } catch (error) {
//         console.log("ERROR IN asyncHandler() :: ",error);
//         res.status(error.code || 500).json({
//             success : false,
//             message : error.message
//         })
//     }
// }

export {asyncHandler}